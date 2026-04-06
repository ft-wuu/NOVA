export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const claudeService = {
  detectIdea: (message: string): boolean => {
    const patterns = [
      /i'm (building|creating|making)/i,
      /my (idea|startup|app)/i,
      /what if (we|i|someone)/i,
      /problem statement/i,
      /(app|platform|tool) (that|which|to)/i,
      /solve the (problem|issue)/i
    ];
    return patterns.some(pattern => pattern.test(message));
  },

  sendToNova: async (messages: ChatMessage[]) => {
    const response = await fetch('/api/nova/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages })
    });
    
    if (!response.ok) {
      throw new Error('Failed to communicate with NOVA AI');
    }
    
    return response.json();
  }
};
