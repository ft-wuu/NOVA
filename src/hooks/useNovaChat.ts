import { useState } from 'react';
import { claudeService } from '../services/claudeService';

export interface UIMessage {
  id: string;
  role: 'user' | 'assistant';
  content?: string;
  type?: 'idea_existing' | 'idea_fresh' | 'general';
  structuredData?: any;
}

export function useNovaChat() {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (text: string) => {
    const isIdea = claudeService.detectIdea(text);
    
    // Check for @nova-ai prefix
    const isNovaTrigger = text.toLowerCase().includes('@nova-ai');
    
    const newUserMsg: UIMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      type: isIdea ? 'idea_fresh' : 'general'
    };

    const updatedMessages = [...messages, newUserMsg];
    setMessages(updatedMessages);
    
    if (!isNovaTrigger) {
        // If they didn't at-mention nova, we just treat it as a standard chat line
        return;
    }

    setIsLoading(true);

    try {
      const apiMessages = updatedMessages.map(m => ({
        role: m.role,
        content: m.content || JSON.stringify(m.structuredData)
      }));

      const data = await claudeService.sendToNova(apiMessages);
      
      const newBotMsg: UIMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        type: data.type,
        content: data.type === 'general' ? data.content : '',
        structuredData: data.type !== 'general' ? data.data : undefined
      };

      setMessages(prev => [...prev, newBotMsg]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return { messages, isLoading, sendMessage };
}
