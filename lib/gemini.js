export default class GeminiClient {
    constructor(apiKey) {
      this.apiKey = apiKey;
      this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro-preview-05-06:generateContent';
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
              maxOutputTokens: 4096
            }
          })
        });
        
        const data = await response.json();

        // Enhanced logging: Log finishReason and usage for every candidate
        if (data.candidates && data.candidates[0]) {
          console.log('[GeminiClient] Received candidate. Finish Reason:', data.candidates[0].finishReason);
          console.log('[GeminiClient] Usage Metadata:', JSON.stringify(data.usageMetadata, null, 2));
        }
        
        if (data.candidates && data.candidates[0]?.content?.parts?.length > 0) {
          // If finishReason was MAX_TOKENS, the text might be incomplete.
          if (data.candidates[0].finishReason === "MAX_TOKENS") {
            console.warn('[GeminiClient] Warning: Response was truncated due to MAX_TOKENS. The returned text might be incomplete.');
          }
          return data.candidates[0].content.parts[0].text;
        } else {
          console.error('Gemini API did not return candidates or content parts in the expected format. Full API response:', JSON.stringify(data, null, 2));
          
          if (data.promptFeedback) {
            console.error('Gemini API promptFeedback:', JSON.stringify(data.promptFeedback, null, 2));
            const blockReason = data.promptFeedback?.blockReason;
            const safetyRatings = data.promptFeedback?.safetyRatings?.map(r => `${r.category}: ${r.probability}`).join(', ');
            throw new Error(`No response generated. Possible safety filtering. Block Reason: ${blockReason || 'N/A'}. Safety Ratings: ${safetyRatings || 'N/A'}`);
          }
          
          // If there's a candidate but no content.parts, include its finishReason in the error
          if (data.candidates && data.candidates[0] && data.candidates[0].finishReason) {
             throw new Error(`No response content generated. Finish Reason: ${data.candidates[0].finishReason}. Unexpected API response structure.`);
          }
          throw new Error('No response generated. Unexpected API response structure.');
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