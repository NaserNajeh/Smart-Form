import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

// --- TYPES ---
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

interface User {
    username: string;
    password?: string; // Optional for login form, required for storage
}

interface StoredData {
    survey: Survey | null;
    responses: SurveyResponse[];
    isSurveyOpen: boolean;
}


// --- STYLES ---
const GlobalStyles = () => {
    const css = `
        :root {
            --primary-color: #0d47a1;
            --primary-light: #5472d3;
            --primary-dark: #002171;
            --secondary-color: #f5f5f5;
            --text-color: #333;
            --background-color: #eef2f5;
            --border-color: #ddd;
            --success-color: #4CAF50;
            --error-color: #f44336;
        }
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        html {
            font-size: 16px;
        }
        body {
            font-family: 'Tajawal', sans-serif;
            background-color: var(--background-color);
            color: var(--text-color);
            line-height: 1.6;
            direction: rtl;
        }
        #root {
            display: flex;
            flex-direction: column;
            align-items: center;
            min-height: 100vh;
        }
        .container {
            width: 100%;
            max-width: 900px;
            background-color: white;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        header {
            background-color: var(--primary-color);
            color: white;
            padding: 1rem 1.5rem;
            text-align: center;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        header h1 {
            margin: 0;
            font-size: 1.8rem;
            font-weight: 700;
        }
        .header-user-info {
            display: flex;
            align-items: center;
            gap: 1rem;
        }
        .logout-btn {
            background: var(--primary-light);
            color: white;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 5px;
            cursor: pointer;
            font-family: 'Tajawal', sans-serif;
            font-size: 0.9rem;
            transition: background-color 0.3s;
        }
        .logout-btn:hover {
            background: var(--primary-dark);
        }
        main {
            padding: 2rem;
        }
        .section-content {
            animation: fadeIn 0.5s ease-in-out;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .uploader-container {
            border: 2px dashed var(--border-color);
            border-radius: 8px;
            padding: 2rem;
            text-align: center;
            background-color: var(--secondary-color);
            margin-bottom: 1.5rem;
        }
        .uploader-container p {
            margin-bottom: 1rem;
            color: #666;
        }
        .file-input {
            display: none;
        }
        .file-label {
            display: inline-block;
            padding: 0.75rem 1.5rem;
            background-color: var(--primary-color);
            color: white;
            border-radius: 5px;
            cursor: pointer;
            transition: background-color 0.3s;
        }
        .file-label:hover {
            background-color: var(--primary-dark);
        }
        .file-name {
            margin-top: 1rem;
            font-weight: 500;
        }
        .btn {
            padding: 0.75rem 2rem;
            font-size: 1rem;
            font-family: 'Tajawal', sans-serif;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            background-color: var(--primary-color);
            color: white;
            transition: background-color 0.3s;
            width: 100%;
            margin-top: 0.5rem;
        }
        .btn-secondary {
            background-color: #6c757d;
        }
        .btn-secondary:hover {
            background-color: #5a6268;
        }
        .btn:disabled {
            background-color: #9e9e9e;
            cursor: not-allowed;
        }
        .btn:not(:disabled):hover {
            background-color: var(--primary-dark);
        }
        .loader {
            border: 4px solid var(--secondary-color);
            border-top: 4px solid var(--primary-color);
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 2rem auto;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .error-message {
            color: var(--error-color);
            background-color: #ffebee;
            border: 1px solid var(--error-color);
            border-radius: 5px;
            padding: 1rem;
            margin-top: 1.5rem;
        }
        .survey-display {
            margin-top: 2rem;
        }
        .survey-title {
            text-align: center;
            margin-bottom: 1rem;
            font-size: 1.5rem;
            color: var(--primary-dark);
        }
        .question-card {
            background-color: #fff;
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 1.5rem;
            margin-bottom: 1rem;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .question-text {
            font-weight: 700;
            margin-bottom: 1rem;
            font-size: 1.1rem;
        }
        .options-container div {
            margin-bottom: 0.5rem;
        }
        .options-container label {
            margin-right: 0.5rem;
            display: inline-flex;
            align-items: center;
        }
        .options-preview {
            margin-top: 0.75rem;
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
        }
        .option-button {
            background-color: var(--secondary-color);
            color: var(--text-color);
            padding: 0.4rem 1rem;
            border-radius: 15px;
            font-size: 0.9rem;
            border: 1px solid var(--border-color);
            cursor: pointer;
            font-family: 'Tajawal', sans-serif;
            transition: background-color 0.2s, color 0.2s, border-color 0.2s;
        }
        .option-button:hover {
            border-color: var(--primary-light);
        }
        .option-button.selected {
            background-color: var(--primary-dark);
            color: white;
            border-color: var(--primary-dark);
        }
        .text-input {
            width: 100%;
            padding: 0.5rem;
            border: 1px solid var(--border-color);
            border-radius: 4px;
            font-family: 'Tajawal', sans-serif;
        }
        .likert-scale {
            display: flex;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 0.5rem;
            padding: 0.5rem 0;
        }
        .likert-scale label {
           display: flex;
           flex-direction: column;
           align-items: center;
           text-align: center;
           font-size: 0.9rem;
           cursor: pointer;
        }
        .modal-backdrop {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            animation: fadeIn 0.3s;
        }
        .modal-content {
            background: var(--background-color);
            padding: 2rem;
            border-radius: 8px;
            width: 90%;
            max-width: 700px;
            max-height: 85vh;
            overflow-y: auto;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        }
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 1rem;
            margin-bottom: 1.5rem;
        }
        .modal-header h2 {
             color: var(--primary-dark);
        }
        .modal-header .close-button {
            background: none;
            border: none;
            font-size: 1.8rem;
            cursor: pointer;
            color: #888;
        }
        .table-container {
            overflow-x: auto;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 1rem;
        }
        th, td {
            border: 1px solid var(--border-color);
            padding: 0.75rem;
            text-align: center;
            white-space: nowrap;
        }
        th {
            background-color: var(--secondary-color);
            font-weight: 700;
        }
        .form-group {
            margin-bottom: 1rem;
        }
        .form-group label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 500;
        }
        .form-control {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid var(--border-color);
            border-radius: 4px;
            font-family: 'Tajawal', sans-serif;
            background-color: white;
            font-size: 1rem;
        }
        .link-input-group {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        .link-input-group input {
            background-color: #eef2f5;
            flex-grow: 1;
        }
        .copy-btn {
            padding: 0.5rem 1rem;
            background-color: var(--success-color);
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            width: 80px;
        }
        .login-container {
            width: 100%;
            max-width: 450px;
            background-color: white;
            padding: 3rem;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
            text-align: center;
        }
        .login-container h2 {
            margin-bottom: 1.5rem;
            color: var(--primary-dark);
        }
        .login-container .toggle-form {
            margin-top: 1.5rem;
            color: #555;
            font-size: 0.9rem;
        }
        .login-container .toggle-form button {
            background: none;
            border: none;
            color: var(--primary-color);
            font-weight: 700;
            cursor: pointer;
            font-family: 'Tajawal', sans-serif;
        }
        .respondent-page {
            max-width: 800px;
            width: 100%;
            padding-top: 2rem;
        }
        .guest-header {
            width: 100%;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1rem 2rem;
            background-color: white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .guest-header h1 {
            color: var(--primary-dark);
            font-size: 1.5rem;
            margin: 0;
        }
        .login-btn-guest {
            background: var(--primary-color);
            color: white;
            border: none;
            padding: 0.6rem 1.2rem;
            border-radius: 5px;
            cursor: pointer;
            font-family: 'Tajawal', sans-serif;
            font-size: 1rem;
            transition: background-color 0.3s;
        }
        .login-btn-guest:hover {
            background: var(--primary-dark);
        }
        .guest-main {
            display: flex;
            justify-content: center;
            align-items: flex-start;
            width: 100%;
            padding: 2rem 1rem;
        }
        .guest-main .container {
            max-width: 700px;
            box-shadow: none;
            background: none;
            padding: 0;
        }

        .tabs-nav {
            display: flex;
            border-bottom: 2px solid var(--border-color);
            margin-bottom: 1.5rem;
        }
        .tab-button {
            padding: 0.8rem 1.5rem;
            border: none;
            background: none;
            cursor: pointer;
            font-size: 1.1rem;
            font-family: 'Tajawal', sans-serif;
            color: #666;
            position: relative;
            transition: color 0.3s;
        }
        .tab-button.active {
            color: var(--primary-color);
            font-weight: 700;
        }
        .tab-button.active::after {
            content: '';
            position: absolute;
            bottom: -2px;
            left: 0;
            right: 0;
            height: 2px;
            background-color: var(--primary-color);
        }
        .tab-content {
            padding: 0 0.5rem;
            animation: fadeIn 0.4s ease;
        }
        .dashboard-section {
            background-color: #f9f9fb;
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
        }
        .dashboard-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
            flex-wrap: wrap;
            gap: 1rem;
        }
        .dashboard-header h3 {
            color: var(--primary-dark);
            margin: 0;
        }
         .dashboard-header .btn, .dashboard-header .btn-secondary {
            width: auto;
            margin-top: 0;
        }

        /* New Styles for Dashboard Overview */
        .dashboard-overview {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }
        .summary-card {
            background-color: #fff;
            border-radius: 8px;
            padding: 1.5rem;
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
            border-left: 5px solid var(--primary-light);
            text-align: right;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .summary-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 8px 20px rgba(0,0,0,0.1);
        }
        .summary-card h4 {
            margin: 0 0 0.5rem 0;
            color: #555;
            font-size: 1rem;
            font-weight: 500;
        }
        .summary-card .value {
            font-size: 2.2rem;
            font-weight: 700;
            color: var(--primary-dark);
        }
        .summary-card .progress-bar-container {
             background-color: #e0e0e0; border-radius: 10px; height: 10px; overflow: hidden; margin-top: 0.5rem;
        }
        .summary-card .progress-bar {
            height: 100%; background-color: var(--success-color); border-radius: 10px; transition: width 0.5s ease-in-out;
        }
        .status-value {
             font-size: 1.5rem;
             font-weight: 700;
        }
        .status-open { color: var(--success-color); }
        .status-closed { color: var(--error-color); }


        /* New Styles for Respondent View */
        .respondent-view-progress {
            position: sticky;
            top: 0;
            z-index: 10;
            padding: 1rem 0;
            background: rgba(255,255,255,0.9);
            backdrop-filter: blur(5px);
            margin-bottom: 1rem;
        }
        .progress-bar-container {
            width: 100%;
            background-color: #e0e0e0;
            border-radius: 10px;
            height: 15px;
            overflow: hidden;
            box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);
        }
        .progress-bar {
            height: 100%;
            background-color: var(--primary-color);
            border-radius: 10px;
            transition: width 0.5s ease-in-out;
            text-align: center;
            color: white;
            font-size: 0.8rem;
            line-height: 15px;
        }
        
        /* New Styles for Results Visualization */
        .results-viz {
            display: flex;
            flex-direction: column;
            gap: 2rem;
        }
        .viz-question-card {
             background-color: #fff;
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 1.5rem;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .bar-chart-container {
            margin-top: 1rem;
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
        }
        .bar-row {
            display: flex;
            align-items: center;
            gap: 1rem;
        }
        .bar-label {
            flex-shrink: 0;
            width: 150px;
            text-align: right;
            font-size: 0.9rem;
            color: #444;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .bar-wrapper {
            flex-grow: 1;
            background-color: var(--secondary-color);
            border-radius: 4px;
            overflow: hidden;
        }
        .bar-fill {
            background-image: linear-gradient(45deg, var(--primary-light), var(--primary-color));
            height: 22px;
            border-radius: 4px;
            transition: width 0.5s ease-out;
            text-align: left;
            padding-left: 8px;
            color: white;
            font-size: 0.8rem;
            line-height: 22px;
            white-space: nowrap;
        }
        .text-responses-list {
            max-height: 250px;
            overflow-y: auto;
            border: 1px solid var(--border-color);
            border-radius: 4px;
            padding: 0;
            margin-top: 1rem;
            background: #fdfdfd;
        }
        .text-responses-list p {
            padding: 0.75rem 1rem;
            border-bottom: 1px solid #eee;
            margin: 0;
            font-size: 0.95rem;
        }
        .text-responses-list p:last-child {
            border-bottom: none;
        }
    `;
    return <style>{css}</style>;
};


// --- API CLIENT ---
const apiClient = {
    _request: async (endpoint: string, method: 'GET' | 'POST', body?: any, username?: string) => {
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (username) {
            headers['x-username'] = username;
        }

        const response = await fetch(`/api/${endpoint}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'An API error occurred');
        }
        return response.json();
    },

    // User Management
    saveUser: (user: User) => apiClient._request('data', 'POST', { action: 'saveUser', payload: user }),
    authenticateUser: (username: string, password_raw: string) => apiClient._request('data', 'POST', { action: 'authenticateUser', payload: { username, password_raw } }),
    
    // Creator Data Management
    getData: (username: string) => apiClient._request('data', 'GET', undefined, username),
    saveData: (username: string, data: StoredData) => apiClient._request('data', 'POST', { action: 'saveData', payload: data }, username),
    
    // Respondent Data Management
    getPublicSurvey: (surveyId: string) => apiClient._request(`data?id=${surveyId}`, 'GET'),
    addResponse: (ownerUsername: string, answers: Record<string, string | string[]>) => apiClient._request('data', 'POST', { action: 'addResponse', payload: { ownerUsername, answers } }),
    
    // AI Survey Creation
    createSurvey: (text: string): Promise<Survey> => apiClient._request('data', 'POST', { action: 'createSurvey', payload: { text } }),
};


// --- COMPONENTS ---
const RespondentView: React.FC<{
    survey: Survey;
    isSurveyOpen: boolean;
    onSubmit: (response: Record<string, string | string[]>) => void;
    isModal?: boolean;
    onClose?: () => void;
}> = ({ survey, isSurveyOpen, onSubmit, isModal = false, onClose }) => {
    const [currentResponse, setCurrentResponse] = useState<Record<string, string | string[]>>({});

    const handleSelectOption = (questionId: number, selectedOption: string | string[]) => {
        setCurrentResponse(prev => ({ ...prev, [`q-${questionId}`]: selectedOption }));
    };

    const handleSubmit = () => {
        const unansweredQuestions = survey.questions.filter(
            q => !currentResponse[`q-${q.id}`] || (Array.isArray(currentResponse[`q-${q.id}`]) && (currentResponse[`q-${q.id}`] as string[]).length === 0)
        );
        if (unansweredQuestions.length > 0) {
            alert(`يرجى الإجابة على جميع الأسئلة قبل الإرسال. أول سؤال متبقي: "${unansweredQuestions[0].text}"`);
            return;
        }
        onSubmit(currentResponse);
    };

    const answeredCount = Object.keys(currentResponse).filter(key => {
        const value = currentResponse[key];
        return value && (Array.isArray(value) ? value.length > 0 : String(value).trim() !== '');
    }).length;
    
    const progress = survey.questions.length > 0 ? (answeredCount / survey.questions.length) * 100 : 0;

    const content = (
        <>
            {isModal && (
                <div className="modal-header">
                    <h2>معاينة: {survey.title}</h2>
                    <button onClick={onClose} className="close-button">&times;</button>
                </div>
            )}
            {!isModal && (
                <>
                    <h1 className="survey-title" style={{fontSize: '2rem'}}>{survey.title}</h1>
                    <div className="respondent-view-progress">
                        <div className="progress-bar-container">
                             <div className="progress-bar" style={{ width: `${progress}%` }}>
                                 {Math.round(progress)}%
                            </div>
                        </div>
                    </div>
                </>
            )}
            <div>
                {survey.questions.map(q => (
                    <div key={q.id} className="question-card" style={{backgroundColor: 'white'}}>
                        <p className="question-text">{q.id}. {q.text}</p>
                        {q.options && q.options.length > 0 && (
                             <div className={q.type === 'likert-5' ? 'likert-scale' : 'options-preview'}>
                                {q.options.map((opt, i) => (
                                    <button
                                        key={i}
                                        className={`option-button ${currentResponse[`q-${q.id}`] === opt ? 'selected' : ''}`}
                                        onClick={() => handleSelectOption(q.id, opt)}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        )}
                        {q.type === 'text' && (
                            <textarea
                                className="text-input"
                                rows={3}
                                placeholder="اكتب إجابتك هنا..."
                                value={(currentResponse[`q-${q.id}`] as string) || ''}
                                onChange={(e) => handleSelectOption(q.id, e.target.value)}
                            ></textarea>
                        )}
                    </div>
                ))}
            </div>
            {isSurveyOpen ? (
                <button className="btn" onClick={handleSubmit} style={{marginTop: '1.5rem', backgroundColor: 'var(--success-color)'}}>
                    إرسال الرد
                </button>
            ) : (
                <p style={{marginTop: '1.5rem', textAlign: 'center', color: 'var(--error-color)', fontWeight: 'bold', background: '#ffebee', padding: '1rem', borderRadius: '8px'}}>
                    هذا الاستبيان مغلق حالياً ولا يستقبل ردوداً جديدة.
                </p>
            )}
        </>
    );

    if (isModal) {
        return (
            <div className="modal-backdrop" onClick={onClose}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>{content}</div>
            </div>
        );
    }

    return <div className="respondent-page">{content}</div>;
};

const ResultsVisualizer: React.FC<{ survey: Survey; responses: SurveyResponse[] }> = ({ survey, responses }) => {
    const analysis = useMemo(() => {
        const results: Record<string, { counts: Record<string, number>, total: number, textResponses: string[] }> = {};
        survey.questions.forEach(q => {
            const questionKey = `q-${q.id}`;
            results[questionKey] = { counts: {}, total: 0, textResponses: [] };
            if (q.options) {
                q.options.forEach(opt => {
                    results[questionKey].counts[opt] = 0;
                });
            }
        });

        responses.forEach(res => {
            survey.questions.forEach(q => {
                const questionKey = `q-${q.id}`;
                const answer = res.answers[questionKey];
                if (answer) {
                    results[questionKey].total++;
                    if (q.type === 'text') {
                         if(String(answer).trim()) results[questionKey].textResponses.push(answer as string);
                    } else if (typeof answer === 'string') {
                        results[questionKey].counts[answer] = (results[questionKey].counts[answer] || 0) + 1;
                    }
                }
            });
        });

        return results;
    }, [survey, responses]);

    return (
        <div className="results-viz">
            {survey.questions.map(q => {
                const questionKey = `q-${q.id}`;
                const data = analysis[questionKey];
                const totalResponses = data.total;

                return (
                    <div key={q.id} className="viz-question-card">
                        <p className="question-text">{q.id}. {q.text}</p>
                        {q.type === 'text' ? (
                             <>
                                <h4 style={{fontWeight: 500, marginBottom: '0.5rem'}}>الإجابات النصية ({data.textResponses.length}):</h4>
                                <div className="text-responses-list">
                                    {data.textResponses.length > 0 ? (
                                        data.textResponses.map((text, i) => <p key={i}>{text}</p>)
                                    ) : (
                                        <p>لا توجد إجابات نصية.</p>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="bar-chart-container">
                                {q.options?.map((opt, i) => {
                                    const count = data.counts[opt] || 0;
                                    const percentage = totalResponses > 0 ? (count / totalResponses) * 100 : 0;
                                    return (
                                        <div key={i} className="bar-row">
                                            <div className="bar-label" title={opt}>{opt}</div>
                                            <div className="bar-wrapper">
                                                <div className="bar-fill" style={{ width: `${percentage}%` }}>
                                                    {count} ({percentage.toFixed(1)}%)
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

const SurveyCreator: React.FC<{ currentUser: User }> = ({ currentUser }) => {
    const [storedData, setStoredData] = useState<StoredData | null>(null);
    const [dataLoading, setDataLoading] = useState(true);

    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showRespondentView, setShowRespondentView] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'survey' | 'results' | 'settings'>('overview');
    const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
    const [showRawResults, setShowRawResults] = useState(false);

    const fetchData = useCallback(async () => {
        setDataLoading(true);
        try {
            const data = await apiClient.getData(currentUser.username);
            setStoredData(data);
        } catch (err: any) {
            setError(err.message || 'Failed to load data.');
        } finally {
            setDataLoading(false);
        }
    }, [currentUser.username]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const saveData = useCallback(async (updatedData: Partial<StoredData>) => {
        if (!storedData || !currentUser) return;
        
        const originalData = { ...storedData };
        const newData = { ...storedData, ...updatedData };
        setStoredData(newData as StoredData); // Optimistic update

        try {
            await apiClient.saveData(currentUser.username, newData as StoredData);
        } catch (err: any) {
            setError(err.message || 'Failed to save changes.');
            setStoredData(originalData); // Revert on error
        }
    }, [storedData, currentUser]);


    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
            setError(null);
        }
    };
    
    const handleProcess = useCallback(async () => {
        if (!file) return;
        setLoading(true); setError(null);
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const newSurvey = await apiClient.createSurvey(e.target?.result as string);
                await saveData({ survey: newSurvey, responses: [], isSurveyOpen: true });
                setFile(null); // Clear file input after success
            } catch (err: any) {
                setError(err.message || "An unknown error occurred.");
            } finally {
                setLoading(false);
            }
        };
        reader.onerror = () => { setLoading(false); setError("Failed to read file."); };
        reader.readAsText(file);
    }, [file, saveData]);
    
    const handleDownloadCSV = () => {
        if (!storedData?.survey || storedData.responses.length === 0) return;
        const { survey, responses } = storedData;
        const headers = ['Response ID', ...survey.questions.map(q => `"${q.text.replace(/"/g, '""')}"`)].join(',');
        const rows = responses.map(res => {
            const rowData = [
                `"${res.id}"`,
                ...survey.questions.map(q => {
                    let cellData = getResponseValue(q, res.answers[`q-${q.id}`]);
                    cellData = String(cellData).replace(/"/g, '""');
                    return `"${cellData}"`;
                })
            ];
            return rowData.join(',');
        });
        const csvContent = `\uFEFF${headers}\n${rows.join('\n')}`;
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${survey.title.replace(/\s/g, '_')}_responses.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleCopy = (key: string, text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedStates(prev => ({ ...prev, [key]: true }));
            setTimeout(() => setCopiedStates(prev => ({ ...prev, [key]: false })), 2000);
        });
    };
    
    const confirmDeleteSurvey = () => {
        setFile(null);
        setError(null);
        setActiveTab('overview');
        saveData({ survey: null, responses: [] });
        setShowDeleteConfirm(false);
    };

    const handleToggleSurveyStatus = () => {
        if (!storedData) return;
        saveData({ isSurveyOpen: !storedData.isSurveyOpen });
    };

    const getResponseValue = (question: SurveyQuestion, responseValue: string | string[]): string | number => {
        if (responseValue === undefined || responseValue === null) return '';
        if (typeof responseValue !== 'string') return responseValue.join(', ');
        if (question.type === 'likert-5' && question.options) {
            const index = question.options.indexOf(responseValue);
            return index !== -1 ? index + 1 : responseValue;
        }
        return responseValue;
    };

    const baseUrl = useMemo(() => window.location.origin + window.location.pathname.replace(/\/$/, ''), []);
    const generalLink = `${baseUrl}?id=${currentUser.username}`;

    if (dataLoading) return <div className="loader"></div>;
    if (!storedData) return <p className="error-message">Could not load user data. Please try again.</p>;

    const { survey, responses, isSurveyOpen } = storedData;
    
    return (
        <div className="section-content">
            {showRespondentView && survey && <RespondentView survey={survey} isSurveyOpen={isSurveyOpen} onSubmit={() => {}} onClose={() => setShowRespondentView(false)} isModal={true} />}
            
            {showDeleteConfirm && (
                <div className="modal-backdrop" onClick={() => setShowDeleteConfirm(false)}>
                    <div className="modal-content" style={{maxWidth: '450px'}} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header"><h3>تأكيد الحذف</h3><button onClick={() => setShowDeleteConfirm(false)} className="close-button">&times;</button></div>
                        <p>هل أنت متأكد من رغبتك في حذف هذا الاستبيان؟ سيتم فقدان جميع الأسئلة والردود بشكل دائم.</p>
                        <div style={{display: 'flex', gap: '1rem', marginTop: '1.5rem'}}>
                            <button onClick={confirmDeleteSurvey} className="btn" style={{backgroundColor: 'var(--error-color)'}}>نعم، احذف</button>
                            <button onClick={() => setShowDeleteConfirm(false)} className="btn btn-secondary">إلغاء</button>
                        </div>
                    </div>
                </div>
            )}

            {!survey && (
                <>
                    <div className="uploader-container">
                        <p>ارفع ملف الأسئلة بصيغة نص عادي (.txt) ليتم تحويله تلقائياً إلى استبيان.</p>
                        <label htmlFor="file-upload" className="file-label">اختر ملف</label>
                        <input id="file-upload" type="file" accept=".txt" onChange={handleFileChange} className="file-input" />
                        {file && <p className="file-name">الملف المختار: {file.name}</p>}
                    </div>
                    <button onClick={handleProcess} disabled={!file || loading} className="btn">
                        {loading ? '...جاري المعالجة' : 'معالجة وتكوين الاستبيان'}
                    </button>
                </>
            )}
            
            {loading && <div className="loader"></div>}
            {error && <p className="error-message">{error}</p>}
            
            {survey && (
                <div className="survey-display">
                    <h2 className="survey-title">{survey.title}</h2>
                    <nav className="tabs-nav">
                        <button className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>نظرة عامة</button>
                        <button className={`tab-button ${activeTab === 'survey' ? 'active' : ''}`} onClick={() => setActiveTab('survey')}>الاستبيان</button>
                        <button className={`tab-button ${activeTab === 'results' ? 'active' : ''}`} onClick={() => setActiveTab('results')}>النتائج</button>
                        <button className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>الإعدادات والمشاركة</button>
                    </nav>

                    <div className="tab-content">
                        {activeTab === 'overview' && (
                             <div className="dashboard-section">
                                <div className="dashboard-header">
                                    <h3>مرحباً بك في لوحة التحكم</h3>
                                </div>
                                 <div className="dashboard-overview" style={{gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))'}}>
                                     <div className="summary-card">
                                        <h4>حالة الاستبيان</h4>
                                        <p className={`value status-value ${isSurveyOpen ? 'status-open' : 'status-closed'}`}>
                                            {isSurveyOpen ? 'مفتوح' : 'مغلق'}
                                        </p>
                                     </div>
                                      <div className="summary-card">
                                        <h4>عدد الأسئلة</h4>
                                        <p className="value">{survey.questions.length}</p>
                                     </div>
                                     <div className="summary-card">
                                        <h4>إجمالي الردود</h4>
                                        <p className="value">{responses.length}</p>
                                     </div>
                                 </div>
                            </div>
                        )}
                        {activeTab === 'survey' && (
                            <div className="dashboard-section">
                                <div className="dashboard-header">
                                    <h3>أسئلة الاستبيان</h3>
                                    <button className="btn btn-secondary" onClick={() => setShowRespondentView(true)}>معاينة كَمُجيب</button>
                                </div>
                                {survey.questions.map(q => (
                                     <div key={q.id} className="question-card">
                                        <p className="question-text">{q.id}. {q.text}</p>
                                        <div className="options-preview">{q.options?.map((opt, i) => <button key={i} className="option-button" disabled>{opt}</button>)}</div>
                                        {q.type === 'text' && <textarea className="text-input" rows={2} readOnly placeholder="إجابة نصية..." />}
                                    </div>
                                ))}
                            </div>
                        )}
                        {activeTab === 'results' && (
                             <div className="dashboard-section">
                                <div className="dashboard-header">
                                    <h3>الردود التي تم جمعها ({responses.length})</h3>
                                    <div>
                                        {responses.length > 0 && <button onClick={() => setShowRawResults(!showRawResults)} className="btn" style={{marginLeft: '1rem'}}>{showRawResults ? 'إخفاء البيانات الخام' : 'عرض البيانات الخام'}</button>}
                                        {responses.length > 0 && <button onClick={handleDownloadCSV} className="btn btn-secondary">تنزيل (CSV)</button>}
                                    </div>
                                </div>
                                {responses.length > 0 ? (
                                    <>
                                        {!showRawResults && <ResultsVisualizer survey={survey} responses={responses} />}
                                        {showRawResults && (
                                            <div className="table-container">
                                                <table>
                                                    <thead><tr><th>رقم الرد</th>{survey.questions.map(q => <th key={q.id}>س{q.id}</th>)}</tr></thead>
                                                    <tbody>
                                                        {responses.map((res, index) => (
                                                            <tr key={index}>
                                                                <td>{res.id}</td>
                                                                {survey.questions.map(q => <td key={q.id}>{getResponseValue(q, res.answers[`q-${q.id}`])}</td>)}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </>
                                ) : (<p style={{textAlign: 'center', color: '#666', marginTop: '2rem'}}>لم يتم جمع أي ردود بعد.</p>)}
                            </div>
                        )}
                         {activeTab === 'settings' && (
                             <div className="dashboard-section">
                                 <div className="dashboard-header"><h3>الإعدادات والمشاركة</h3></div>
                                 <div className="form-group">
                                    <label>الحالة العامة للاستبيان:</label>
                                    <div style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
                                         <span style={{fontWeight: 700, color: isSurveyOpen ? 'var(--success-color)' : 'var(--error-color)'}}>
                                            {isSurveyOpen ? 'مفتوح لاستقبال الردود' : 'مغلق'}
                                        </span>
                                        <button onClick={handleToggleSurveyStatus} className="btn btn-secondary" style={{width: 'auto', marginTop: 0}}>
                                            {isSurveyOpen ? 'إغلاق الردود' : 'فتح الردود'}
                                        </button>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>رابط المشاركة المباشر:</label>
                                     <p style={{fontSize: '0.9rem', color: '#666', margin: '-0.5rem 0 0.75rem 0'}}>أي شخص يملك هذا الرابط يمكنه المشاركة في الاستبيان.</p>
                                    <div className="link-input-group">
                                        <input type="text" readOnly value={generalLink} className="form-control" onClick={(e) => (e.target as HTMLInputElement).select()} />
                                        <button className="copy-btn" onClick={() => handleCopy('general', generalLink)}>{copiedStates['general'] ? 'تم النسخ!' : 'نسخ'}</button>
                                    </div>
                                </div>
                                <div className="form-group" style={{marginTop: '2rem'}}>
                                    <label style={{color: 'var(--error-color)', fontWeight: 700}}>منطقة الخطر</label>
                                     <button onClick={() => setShowDeleteConfirm(true)} className="btn" style={{backgroundColor: 'var(--error-color)', width: 'auto'}}>حذف الاستبيان نهائياً</button>
                                </div>
                            </div>
                         )}
                    </div>
                </div>
            )}
        </div>
    );
};

const LoginPage: React.FC<{ onLogin: (user: User) => void }> = ({ onLogin }) => {
    const [isRegister, setIsRegister] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        setError('');
        if (username.trim().length < 3) {
            setError('يجب أن يكون اسم المستخدم 3 أحرف على الأقل.'); return;
        }
        if (/\s/.test(username)) {
            setError('يجب ألا يحتوي اسم المستخدم على مسافات.'); return;
        }
        if (password.length < 6) {
            setError('يجب أن تكون كلمة المرور 6 أحرف على الأقل.'); return;
        }

        setLoading(true);
        try {
            if (isRegister) {
                if (password !== confirmPassword) {
                    throw new Error('كلمتا المرور غير متطابقتين.');
                }
                await apiClient.saveUser({ username: username.toLowerCase(), password });
            } else {
                await apiClient.authenticateUser(username.toLowerCase(), password);
            }
            onLogin({ username: username.toLowerCase() });
        } catch(err: any) {
            setError(err.message || 'An unknown error occurred.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container" style={{boxShadow: 'none', borderRadius: '12px', background: 'white'}}>
            <h2>{isRegister ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}</h2>
            
            <div className="form-group" style={{textAlign: 'right'}}>
                <label htmlFor="username">اسم المستخدم (باللغة الإنجليزية)</label>
                <input id="username" type="text" className="form-control" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="مثال: ahmad_research" />
            </div>
             <div className="form-group" style={{textAlign: 'right'}}>
                <label htmlFor="password">كلمة المرور</label>
                <input id="password" type="password" className="form-control" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {isRegister && (
                 <div className="form-group" style={{textAlign: 'right'}}>
                    <label htmlFor="confirmPassword">تأكيد كلمة المرور</label>
                    <input id="confirmPassword" type="password" className="form-control" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && !loading && handleSubmit()}/>
                </div>
            )}
            {error && <p style={{color: 'var(--error-color)', fontSize: '0.9rem', marginBottom: '1rem'}}>{error}</p>}
            <button className="btn" onClick={handleSubmit} disabled={loading}>
                {loading ? '...جاري التحميل' : (isRegister ? 'إنشاء الحساب' : 'دخول')}
            </button>

             <div className="toggle-form">
                {isRegister ? 'لديك حساب بالفعل؟' : 'ليس لديك حساب؟'}
                <button onClick={() => {setIsRegister(!isRegister); setError('');}}>
                    {isRegister ? 'سجل الدخول' : 'أنشئ حساباً'}
                </button>
            </div>
        </div>
    );
};

const LoginModal: React.FC<{ onLogin: (user: User) => void; onClose: () => void }> = ({ onLogin, onClose }) => {
    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content" style={{maxWidth: '450px', padding: 0, background: 'transparent'}} onClick={(e) => e.stopPropagation()}>
                <LoginPage onLogin={onLogin} />
            </div>
        </div>
    );
};


const GuestExperience: React.FC<{ onLoginRequest: () => void }> = ({ onLoginRequest }) => {
    const [file, setFile] = useState<File | null>(null);

    return (
        <>
            <div className="guest-header">
                <h1>أداة بناء الاستبيانات</h1>
                <button onClick={onLoginRequest} className="login-btn-guest">تسجيل الدخول / إنشاء حساب</button>
            </div>
            <main className="guest-main">
                <div className="container">
                    <div className="uploader-container">
                        <p>ارفع ملف الأسئلة بصيغة نص عادي (.txt) ليتم تحويله تلقائياً إلى استبيان.</p>
                        <label htmlFor="file-upload" className="file-label">اختر ملف</label>
                        <input id="file-upload" type="file" accept=".txt" onChange={e => e.target.files && setFile(e.target.files[0])} className="file-input" />
                        {file && <p className="file-name">الملف المختار: {file.name}</p>}
                    </div>
                    <button onClick={onLoginRequest} disabled={!file} className="btn">معالجة وتكوين الاستبيان</button>
                    {!file && <p style={{textAlign: 'center', marginTop: '1rem', color: '#666'}}>اختر ملفاً لتفعيل زر المعالجة.</p>}
                </div>
            </main>
        </>
    );
}

const RespondentOnlyPage: React.FC<{ surveyId: string }> = ({ surveyId }) => {
    const [data, setData] = useState<Partial<StoredData> | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        const fetchSurvey = async () => {
            setIsLoading(true);
            try {
                const publicData = await apiClient.getPublicSurvey(surveyId);
                setData(publicData);
            } catch (err: any) {
                setError(err.message || "لم يتم العثور على الاستبيان. قد يكون الرابط غير صحيح.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchSurvey();
    }, [surveyId]);

    const handleSubmit = async (answers: Record<string, string | string[]>) => {
        setIsLoading(true);
        try {
            await apiClient.addResponse(surveyId, answers);
            setSubmitted(true);
        } catch (err: any) {
            setError(err.message || "فشل إرسال الرد. يرجى المحاولة مرة أخرى.");
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) return <div className="loader" style={{marginTop: '4rem'}}></div>;

    if (submitted) {
        return (
             <div className="login-container" style={{marginTop: '4rem'}}>
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{color: 'var(--success-color)', margin: '0 auto 1rem auto'}}>
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor"/>
                </svg>
                <h2 style={{color: 'var(--success-color)'}}>شكراً لك!</h2>
                <p>تم إرسال ردك بنجاح.</p>
            </div>
        )
    }

    if (error) {
         return <div className="error-message" style={{marginTop: '4rem'}}>{error}</div>;
    }

    if (data && data.survey && typeof data.isSurveyOpen !== 'undefined') {
        return <RespondentView survey={data.survey} isSurveyOpen={data.isSurveyOpen} onSubmit={handleSubmit} />;
    }

    return <div className="error-message" style={{marginTop: '4rem'}}>حدث خطأ غير متوقع أو أن الاستبيان غير موجود.</div>;
}

// --- MAIN APP ---
const App: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [urlParams, setUrlParams] = useState<{ surveyId: string | null }>({ surveyId: null });
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [isInitialising, setIsInitialising] = useState(true);

    useEffect(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            const surveyId = params.get('id');
            if (surveyId) {
                setUrlParams({ surveyId });
            }

            const storedUser = sessionStorage.getItem('survey_app_user');
            if (storedUser) {
                setCurrentUser(JSON.parse(storedUser));
            }
        } catch (e) {
            console.error("Initialization error:", e);
        } finally {
            setIsInitialising(false);
        }
    }, []);

    const handleLogin = (user: User) => {
        setCurrentUser(user);
        sessionStorage.setItem('survey_app_user', JSON.stringify(user));
        setShowLoginModal(false);
    };

    const handleLogout = () => {
        setCurrentUser(null);
        sessionStorage.removeItem('survey_app_user');
    };
    
    if (isInitialising) {
        return <div className="loader" style={{marginTop: '5rem'}}></div>
    }

    if (urlParams.surveyId) {
        return (
            <>
                <GlobalStyles />
                <RespondentOnlyPage surveyId={urlParams.surveyId} />
            </>
        );
    }

    return (
        <>
            <GlobalStyles />
            {currentUser ? (
                <div className="container" style={{marginTop: '2rem', marginBottom: '2rem'}}>
                    <header>
                        <h1>أداة بناء الاستبيانات</h1>
                        <div className="header-user-info">
                            <span>أهلاً، {currentUser.username}</span>
                            <button onClick={handleLogout} className="logout-btn">تسجيل الخروج</button>
                        </div>
                    </header>
                    <main>
                        <SurveyCreator currentUser={currentUser} />
                    </main>
                </div>
            ) : (
                <GuestExperience onLoginRequest={() => setShowLoginModal(true)} />
            )}
            {showLoginModal && <LoginModal onLogin={handleLogin} onClose={() => setShowLoginModal(false)} />}
        </>
    );
};

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<App />);
}