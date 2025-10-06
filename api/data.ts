import { kv } from '@vercel/kv';

export const config = {
    runtime: 'edge',
};

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

// --- API Handler (Edge Runtime Compatible) ---
export default async function handler(request: Request): Promise<Response> {
    try {
        const { method, headers } = request;
        const { searchParams } = new URL(request.url);
        const jsonResponse = (data: any, status: number) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

        if (method === 'GET') {
            const usernameFromHeader = headers.get('x-username');
            const surveyIdFromQuery = searchParams.get('id');

            if (usernameFromHeader) { // Authenticated request for creator's dashboard
                const data = await getData(usernameFromHeader);
                return jsonResponse(data, 200);
            }
            
            if (surveyIdFromQuery) { // Public request for a survey
                const data = await getData(surveyIdFromQuery);
                if (data && data.survey) {
                    const publicData = { survey: data.survey, isSurveyOpen: data.isSurveyOpen };
                    return jsonResponse(publicData, 200);
                }
                return jsonResponse({ error: 'لم يتم العثور على الاستبيان.' }, 404);
            }
            
            return jsonResponse({ error: 'Username header or survey ID is required' }, 400);
        }

        if (method === 'POST') {
            const { action, payload } = await request.json();
            
            switch (action) {
                case 'saveUser':
                    const success = await saveUser(payload);
                    if (!success) return jsonResponse({ error: 'اسم المستخدم هذا موجود بالفعل.' }, 409);
                    return jsonResponse({ success: true }, 201);

                case 'authenticateUser':
                    const authenticated = await authenticateUser(payload.username, payload.password_raw);
                    if (!authenticated) return jsonResponse({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة.' }, 401);
                    return jsonResponse({ success: true }, 200);
                
                case 'saveData': {
                     const username = headers.get('x-username');
                     if (!username) return jsonResponse({ error: 'Username header is required' }, 400);
                     await saveData(username, payload);
                     return jsonResponse({ success: true }, 200);
                }

                case 'addResponse': {
                     const { ownerUsername, answers } = payload;
                     if (!ownerUsername || !answers) return jsonResponse({ error: 'Invalid response payload' }, 400);
                     await addResponse(ownerUsername, { answers });
                     return jsonResponse({ success: true }, 200);
                }

                default:
                    return jsonResponse({ error: 'Invalid action' }, 400);
            }
        }

        return new Response(`Method ${method} Not Allowed`, { status: 405, headers: { 'Allow': 'GET, POST' } });

    } catch (error: any) {
        console.error('API Error:', error);
        return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}
