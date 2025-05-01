
export default class GeminiClient {
    constructor(apiKey) {
      this.apiKey = apiKey;
      this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
    }
    
    async generateResponse(prompt, messageHistory = []) {
      // Format the conversation history for Gemini API
      const formattedHistory = messageHistory.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));
      
      // Add the current prompt
      const contents = [
        ...formattedHistory,
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ];
      
      try {
        const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 800
            }
          })
        });
        
        const data = await response.json();
        
        if (data.candidates && data.candidates[0]?.content?.parts?.length > 0) {
          return data.candidates[0].content.parts[0].text;
        } else {
          throw new Error('No response generated');
        }
        
      } catch (error) {
        console.error('Error calling Gemini API:', error);
        throw error;
      }
    }
    
    // Helper method to extract structured data from LLM responses
    async processWithStructuredOutput(prompt, messageHistory = [], responseFormat) {
      // Enhance the prompt to request structured output
      const enhancedPrompt = `
        ${prompt}
        
        Please format your response as a JSON object with the following structure:
        ${JSON.stringify(responseFormat, null, 2)}
        
        Return ONLY the JSON object without any additional text.
      `;
      
      const response = await this.generateResponse(enhancedPrompt, messageHistory);
      
      try {
        // Extract JSON from the response
        const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) || 
                         response.match(/{[\s\S]*}/);
                         
        const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : response;
        return JSON.parse(jsonString);
      } catch (error) {
        console.error('Error parsing structured output:', error);
        return { error: 'Could not parse structured output', rawResponse: response };
      }
    }
  }