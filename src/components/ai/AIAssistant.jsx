
import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, Loader2, AlertTriangle, Play, Brain, X } from "lucide-react";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User } from '@/api/entities'; // Renamed import from CurrentUserEntity
import { InvokeLLM } from '@/api/integrations';
import Markdown from 'react-markdown';

export default function AIAssistant({ isOpen, onClose }) {
  const [userInput, setUserInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await User.me();
        setCurrentUser(user);
      } catch (e) {
        console.error("Error fetching user data for AI Assistant:", e);
        // Not logged in or error, currentUser will be null
      }
    };
    if (isOpen) {
      fetchUser();
      // Reset messages and error when opening
      setMessages([{ sender: 'ai', text: 'שלום! אני העוזר הוירטואלי שלך. איך אני יכול לעזור לך היום?', id: Date.now() + '_welcome' }]);
      setError(null);
    } else {
      setMessages([]); // Clear messages when closing
    }
  }, [isOpen]);

  const handleInputChange = (e) => {
    setUserInput(e.target.value);
  };

  const extractActionableJson = (text) => {
    // Try to find a JSON block within ```json ... ```
    const match = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
      try {
        const jsonData = JSON.parse(match[1]);
        // Remove the json block from the main message if it's distinct
        const cleanedText = text.replace(match[0], '').trim();
        return { actionData: jsonData, displayText: cleanedText || "הבנתי את הפעולה הבאה:" };
      } catch (e) {
        // Not a valid JSON, or some other error, treat as plain text
        return null;
      }
    }
    return null;
  };

  const handleSendMessage = async () => {
    if (!userInput.trim()) return;
    const newUserMessage = { sender: "user", text: userInput };
    setMessages(prev => [...prev, newUserMessage]);
    setUserInput("");
    setIsLoading(true);
    setError(null);

    try {
      // Basic system prompt, can be enhanced
      const systemPrompt = `אתה עוזר AI במערכת ניהול אבטחה בשם FortX.
      המשתמש הנוכחי הוא: ${currentUser?.full_name || 'אורח'}. תפקידיו: ${currentUser?.roles?.map(r => r.name).join(', ') || 'לא ידוע'}.
      השעה הנוכחית: ${new Date().toLocaleString('he-IL')}.
      המטרה שלך היא להבין את בקשות המשתמש ולעזור לו.
      אם המשתמש מבקש ממך לבצע פעולה במערכת (כמו יצירת נוהל, דיווח אירוע, הוספת משתמש וכו'),
      עליך לנסות לפרק את הבקשה לפרמטרים הנדרשים, ולהחזיר אותם בפורמט JSON עטוף ב-\`\`\`json ... \`\`\`.
      לדוגמה, אם המשתמש אומר "צור משמרת חדשה מחר מ-8 עד 17 באתר המרכזי",
      אתה יכול להחזיר משהו כמו:
      \`\`\`json
      {
        "action": "create_shift",
        "params": {
          "site_name": "האתר המרכזי",
          "date": "מחר",
          "start_time": "08:00",
          "end_time": "17:00"
        }
      }
      \`\`\`
      בנוסף ל-JSON, תוכל להוסיף הודעת טקסט רגילה.
      אם אינך בטוח לגבי פרט מסוים, בקש הבהרה מהמשתמש.
      השתדל להיות מועיל וידידותי. השתמש בשפה העברית.
      אם המשתמש שואל על יכולותיך, ציין שאתה יכול לעזור ביצירת נהלים ודוחות חדשים.`;
      
      const response = await InvokeLLM({
        prompt: `${systemPrompt}\n\nהמשתמש: ${newUserMessage.text}`,
      });
      
      let aiResponseText = "";
      let actionData = null;

      if (typeof response === 'string') {
        aiResponseText = response;
        const extracted = extractActionableJson(response);
        if (extracted) {
          actionData = extracted.actionData;
          aiResponseText = extracted.displayText; // Use cleaned text if JSON was distinct
        }
      } else {
        aiResponseText = "התקבלה תשובה לא צפויה מה-AI.";
      }

      const newAiMessage = { sender: "ai", text: aiResponseText, action: actionData };
      setMessages(prev => [...prev, newAiMessage]);

    } catch (err) {
      console.error("Error calling AI:", err);
      setError("שגיאה בתקשורת עם העוזר החכם.");
      const errorMsg = { sender: "ai", text: "שגיאה בתקשורת. נסה שוב מאוחר יותר.", isError: true };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteAction = (action) => {
    // Placeholder for actual action execution
    // In a real application, this would trigger a Redux action, API call, or navigation
    alert(`הפעולה "${action.action}" עם הפרמטרים ${JSON.stringify(action.params, null, 2)} תבוצע בעתיד.`);
    // For now, you could navigate or pre-fill a form
    // Example: if (action.action === "create_incident") navigateTo(createPageUrl("CreateIncidentPage", action.params))
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-20 left-4 w-96 h-[600px] shadow-2xl rounded-2xl flex flex-col bg-white z-[100] clay-card border-2 border-indigo-100" dir="rtl">
      <header className="flex flex-row items-center justify-between p-4 bg-indigo-500 text-white rounded-t-2xl">
        <div className="flex items-center gap-2">
          <Brain className="w-7 h-7" /> {/* Updated Icon */}
          <h2 className="text-lg font-semibold">FortX AI Assistant</h2>
        </div>
        <button onClick={onClose} className="text-white hover:bg-indigo-600 p-1 rounded">
          <X className="w-5 h-5" />
        </button>
      </header>
      
      <ScrollArea className="flex-grow p-4 space-y-3 bg-gradient-to-br from-indigo-50 to-purple-50">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} mb-3`}>
            <div 
              className={`max-w-[80%] p-3 rounded-xl shadow-md text-sm
                ${msg.sender === 'user' 
                  ? 'bg-indigo-500 text-white rounded-br-none' 
                  : msg.isError 
                    ? 'bg-red-100 text-red-700 rounded-bl-none border border-red-200'
                    : 'bg-white text-gray-800 rounded-bl-none border border-indigo-100'
                }`}
            >
              {typeof msg.text === 'string' ? <Markdown>{msg.text}</Markdown> : JSON.stringify(msg.text)}
              
              {msg.sender === 'ai' && msg.action && (
                  <div className="mt-2 pt-2 border-t border-slate-200">
                    <p className="text-xs text-slate-500 mb-1">זוהתה פעולה לביצוע:</p>
                    <pre className="text-xs bg-slate-200 p-2 rounded-md overflow-x-auto text-left">
                      {JSON.stringify(msg.action, null, 2)}
                    </pre>
                    <Button 
                      onClick={() => handleExecuteAction(msg.action)}
                      size="sm"
                      className="mt-2 clay-button bg-green-100 hover:bg-green-200 text-green-700 w-full"
                    >
                      <Play className="w-4 h-4 ml-2" />
                      בצע פעולה (הדגמה)
                    </Button>
                  </div>
                )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start mb-3">
            <div className="max-w-[80%] p-3 rounded-xl shadow-md text-sm bg-white text-gray-800 rounded-bl-none border border-indigo-100 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
              <span>חושב...</span>
            </div>
          </div>
        )}
        {error && (
             <div className="flex justify-start mb-3">
                <div className="max-w-[80%] p-3 rounded-xl shadow-md text-sm bg-red-100 text-red-700 rounded-bl-none border border-red-200 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 mr-2"/>
                    <span>{error}</span>
                </div>
            </div>
          )}
        <div ref={messagesEndRef} />
      </ScrollArea>
      
      <div className="p-3 border-t bg-white rounded-b-2xl">
        <div className="flex w-full items-center gap-2">
          <Input 
            type="text" 
            placeholder="שאל אותי משהו..."
            value={userInput}
            onChange={handleInputChange}
            onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSendMessage()}
            className="flex-grow clay-input !rounded-lg focus:!ring-indigo-500"
            disabled={isLoading}
          />
          <Button 
            size="icon" 
            onClick={handleSendMessage} 
            disabled={isLoading || userInput.trim() === ''}
            className="bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg w-10 h-10 clay-button"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
