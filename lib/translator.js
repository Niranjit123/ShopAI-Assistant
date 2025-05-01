// lib/translator.js

// Language code mapping for NLLB
const LANGUAGE_MAPPING = {
  "en": "eng_Latn",        // English
  "hi": "hin_Deva",        // Hindi
  "ta": "tam_Taml",        // Tamil
  "mni": "mni_Beng",       // Meitei (Bengali script)
  "mni-Mtei": "mni_Mtei",  // Meitei (Meetei Mayek script)
  "mni-Beng": "mni_Beng",  // Meitei (Bengali script)
  "hindi": "hin_Deva",     // Hindi - alternative name
  "tamil": "tam_Taml",     // Tamil - alternative name
  "meitei": "mni_Beng",    // Meitei - alternative name
  "english": "eng_Latn"    // English - alternative name
};

// Script ranges for language detection
const SCRIPT_RANGES = {
  "mni_Mtei": [[0xABC0, 0xABFF]],  // Meetei Mayek script
  "mni_Beng": [[0x0980, 0x09FF]],  // Bengali script (for Meitei in Bengali script)
  "hin_Deva": [[0x0900, 0x097F]],  // Devanagari script (Hindi)
  "tam_Taml": [[0x0B80, 0x0BFF]],  // Tamil script
  "eng_Latn": [[0x0041, 0x005A], [0x0061, 0x007A]]  // Latin script (English)
};

class TranslatorClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.apiUrl = "https://api-inference.huggingface.co/models/facebook/nllb-200-distilled-600M";
  }

  /**
   * Detect language based on script ranges
   * @param {string} text - Text to detect language from
   * @returns {string} - Detected language code in NLLB format
   */
  detectLanguageByScript(text) {
    const scriptCounts = Object.fromEntries(
      Object.keys(SCRIPT_RANGES).map(script => [script, 0])
    );

    // Count characters matching each script range
    for (const char of text) {
      const charCode = char.charCodeAt(0);
      
      for (const [script, ranges] of Object.entries(SCRIPT_RANGES)) {
        for (const [start, end] of ranges) {
          if (charCode >= start && charCode <= end) {
            scriptCounts[script]++;
            break;
          }
        }
      }
    }

    // Find the script with the most characters
    if (!Object.values(scriptCounts).some(count => count > 0)) {
      return "eng_Latn"; // Default to English if no script match
    }

    let maxScript = "eng_Latn";
    let maxCount = 0;
    
    for (const [script, count] of Object.entries(scriptCounts)) {
      if (count > maxCount) {
        maxScript = script;
        maxCount = count;
      }
    }
    
    return maxScript;
  }

  /**
   * Translate text using Hugging Face NLLB model
   * @param {string} text - Text to translate
   * @param {string} targetLanguage - Target language code
   * @param {string} sourceLanguage - Source language code (optional)
   * @returns {Promise<string>} - Translated text
   */
  async translate(text, targetLanguage, sourceLanguage = null) {
    try {
      // Auto-detect source language if not provided
      if (!sourceLanguage) {
        const detectedScript = this.detectLanguageByScript(text);
        sourceLanguage = detectedScript.split('_')[0]; // Get base language code
        console.log(`Detected source language: ${detectedScript} (base: ${sourceLanguage})`);
      }

      // Convert language codes to NLLB format
      const nllbTarget = LANGUAGE_MAPPING[targetLanguage] || targetLanguage;
      const nllbSource = LANGUAGE_MAPPING[sourceLanguage] || sourceLanguage;

      console.log(`Translating from ${nllbSource} to ${nllbTarget}`);

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: text,
          parameters: {
            src_lang: nllbSource,
            tgt_lang: nllbTarget
          }
        })
      });

      // Check if response is OK
      if (!response.ok) {
        const responseText = await response.text();
        console.error('Translation API error:', response.status, responseText);
        return text; // Fallback to original text
      }

      const data = await response.json();
      
      // Handle different response formats from Hugging Face API
      if (Array.isArray(data) && data.length > 0) {
        return data[0].translation_text;
      } else if (data.translation_text) {
        return data.translation_text;
      } else {
        console.error('Unexpected translation response format:', data);
        return text; // Fallback to original text
      }
    } catch (error) {
      console.error('Translation API error:', error);
      return text; // Fallback to original text
    }
  }

  /**
   * Translate text to English
   * @param {string} text - Text to translate
   * @returns {Promise<string>} - English translation
   */
  async translateToEnglish(text) {
    // Auto-detect source language
    const detectedScript = this.detectLanguageByScript(text);
    const sourceLanguage = detectedScript.split('_')[0]; // Get base language code
    
    // Skip translation if already English
    if (detectedScript === "eng_Latn") {
      return text;
    }
    
    return this.translate(text, "en", sourceLanguage);
  }

  /**
   * Translate text to Manipuri
   * @param {string} text - Text to translate (assumed to be English)
   * @returns {Promise<string>} - Manipuri translation
   */
  async translateToManipuri(text) {
    return this.translate(text, "mni", "en");
  }
}

export default TranslatorClient;