import { NextResponse } from 'next/server';
import { translateText } from '@/lib/translation';

export async function POST(request) {
  try {
    const { text, sourceLang, targetLang } = await request.json();

    if (!text || !sourceLang || !targetLang) {
      return NextResponse.json({ error: 'Missing required parameters: text, sourceLang, targetLang' }, { status: 400 });
    }

    console.log(`[API /translate-product] Request to translate: "${text.substring(0,50)}..." from ${sourceLang} to ${targetLang}`);
    const translatedText = await translateText(text, sourceLang, targetLang);
    console.log(`[API /translate-product] Translation result: "${translatedText.substring(0,50)}..."`);

    return NextResponse.json({ translation: translatedText });

  } catch (error) {
    console.error('[API /translate-product] Error:', error);
    return NextResponse.json({ error: 'Failed to translate text', details: error.message }, { status: 500 });
  }
}