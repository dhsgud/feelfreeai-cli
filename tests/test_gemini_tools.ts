import { GeminiProvider } from '../src/providers/gemini';
import { Message, Tool } from '../src/config/types';
import { loadConfig, getApiKeyFromEnv } from '../src/config/manager';

async function testGeminiTools() {
    const config = await loadConfig();
    const apiKey = config.providers.gemini.apiKey || getApiKeyFromEnv('gemini');

    if (!apiKey) {
        console.error('Gemini API key not found in config or env. Please run "feelfree config" or set GEMINI_API_KEY.');
        return;
    }

    const provider = new GeminiProvider({ apiKey });

    const tools: Tool[] = [
        {
            name: 'get_current_weather',
            description: 'Get the current weather in a given location',
            parameters: {
                type: 'object',
                properties: {
                    location: {
                        type: 'string',
                        description: 'The city and state, e.g. San Francisco, CA',
                    },
                    unit: {
                        type: 'string',
                        enum: ['celsius', 'fahrenheit'],
                    },
                },
                required: ['location'],
            },
            execute: async (args) => {
                return { location: args.location, temperature: '20', unit: 'celsius' };
            },
        },
    ];

    const messages: Message[] = [
        {
            role: 'user',
            content: 'What is the weather in Seoul?',
        },
    ];

    console.log('Sending request with tools...');
    const response = await provider.chat(messages, undefined, tools);

    console.log('Response text:', response.text);
    console.log('Tool calls:', response.toolCalls);

    if (response.toolCalls && response.toolCalls.length > 0) {
        console.log('SUCCESS: Tool call received!');
        console.log('Tool Name:', response.toolCalls[0].name);
        console.log('Arguments:', response.toolCalls[0].arguments);
    } else {
        console.log('FAILURE: No tool call received.');
    }
}

testGeminiTools().catch(console.error);
