import { kv } from '@vercel/kv';
import { NextApiRequest, NextApiResponse } from 'next';

// --- TYPES for API context ---
interface User {
    username: string;
    password?: string;
}

interface SurveyQuestion {
  id: number;
  text: string;
  type: 'single-choice' | 'multiple-choice' | 'likert-5' | 'text' | 'binary';
  options?: string[];
}

interface Survey {
  title: string;
  questions: SurveyQuestion[];
}

type SurveyResponse = {
    id: number;
    submittedAt: number;
    answers: Record<string, string | string[]>;
}

interface StoredData {
    survey: Survey | null;
    responses: SurveyResponse[];
    isSurveyOpen: boolean;
}

// --- Database Keys ---
const DB_USERS_KEY = `survey_app_users`;
const getSurveyDataKey = (username: string) => `survey_app_data_${username}`;


// --- Backend Database Logic using Vercel KV ---

// User Management
const getUsers = async (): Promise<Record<string, User>> => {
    return await kv.get(DB_USERS_KEY) || {};
};

const saveUser = async (user: User): Promise<boolean> => {
    const users = await getUsers();
    if (users[user.username]) {
        return false; // User already exists
    }
    users[user.username] = user;
    await kv.set(DB_USERS_KEY, users);
    
    // Also initialize their data store
    const initialData: StoredData = { survey: null, responses: [], isSurveyOpen: true };
    await kv.set(getSurveyDataKey(user.username), initialData);
    
    return true;
};

const authenticateUser = async (username: string, password_raw: string): Promise<boolean> => {
    const users = await getUsers();
    const user = users[username];
    // IMPORTANT: In a real-world app, passwords should be hashed using bcrypt or argon2.
    // This is a simplified check for demonstration purposes.
    return user && user.password === password_raw;
};


// Survey Data Management
const getData = async (username: string): Promise<StoredData | null> => {
    const data = await kv.get<StoredData>(getSurveyDataKey(username));
    if (data) return data;
    
    const users = await getUsers();
    if(!users[username]) return null; // User does not exist

    // If no data exists (e.g., for a user created before this logic), initialize it.
    const initialData: StoredData = { survey: null, responses: [], isSurveyOpen: true };
    await kv.set(getSurveyDataKey(username), initialData);
    return initialData;
};

const saveData = async (username: string, data: StoredData) => {
    await kv.set(getSurveyDataKey(username), data);
};

const addResponse = async (username: string, newResponse: { answers: Record<string, string | string[]> }) => {
    const data = await getData(username);
    if (!data) {
        throw new Error("Survey owner not found.");
    }
    const responseToAdd: SurveyResponse = {
        id: Date.now(),
        submittedAt: Date.now(),
        answers: newResponse.answers,
    };
    data.responses.push(responseToAdd);
    await saveData(username, data);
};

// --- API Handler ---
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        if (req.method === 'GET') {
            const usernameFromHeader = req.headers['x-username'] as string;
            const surveyIdFromQuery = req.query.id as string;

            if (usernameFromHeader) { // Authenticated request for creator's dashboard
                const data = await getData(usernameFromHeader);
                return res.status(200).json(data);

            } else if (surveyIdFromQuery) { // Public request for a survey
                const data = await getData(surveyIdFromQuery);
                if (data && data.survey) {
                    // Only return public-safe data
                    const publicData = {
                        survey: data.survey,
                        isSurveyOpen: data.isSurveyOpen,
                    };
                    return res.status(200).json(publicData);
                } else {
                    return res.status(404).json({ error: 'لم يتم العثور على الاستبيان.' });
                }
            } else {
                return res.status(400).json({ error: 'Username header or survey ID is required' });
            }
        }

        if (req.method === 'POST') {
            const { action, payload } = req.body;
            
            switch (action) {
                case 'saveUser':
                    const success = await saveUser(payload);
                    if (!success) {
                        return res.status(409).json({ error: 'اسم المستخدم هذا موجود بالفعل.' });
                    }
                    return res.status(201).json({ success: true });

                case 'authenticateUser':
                    const authenticated = await authenticateUser(payload.username, payload.password_raw);
                    if (!authenticated) {
                         return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة.' });
                    }
                    return res.status(200).json({ success: true });
                
                case 'saveData': {
                     const username = req.headers['x-username'] as string;
                     if (!username) return res.status(400).json({ error: 'Username header is required' });
                     await saveData(username, payload);
                     return res.status(200).json({ success: true });
                }
                case 'addResponse': {
                     const { ownerUsername, answers } = payload;
                     if (!ownerUsername || !answers) return res.status(400).json({ error: 'Invalid response payload' });
                     await addResponse(ownerUsername, { answers });
                     return res.status(200).json({ success: true });
                }
                default:
                    return res.status(400).json({ error: 'Invalid action' });
            }
        }

        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);

    } catch (error: any) {
        console.error('API Error:', error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}
