import { LlamaCppProvider } from '../src/providers/llamacpp';
import { Message, Tool } from '../src/config/types';
import { loadConfig } from '../src/config/manager';

async function testLlamaCppTools() {
    const config = await loadConfig();
    const endpoint = config.providers.llamacpp.endpoint || 'http://localhost:8080';

    console.log(`Using LlamaCpp endpoint: ${endpoint}`);

    const provider = new LlamaCppProvider({ endpoint });

    // Health check
    const isHealthy = await provider.checkHealth();
    if (!isHealthy) {
        console.error('LlamaCpp server is not reachable. Please start the server.');
        return;
    }

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
    try {
        const response = await provider.chat(messages, undefined, tools);

        console.log('Response text:', response.text);
        console.log('Tool calls:', response.toolCalls);

        if (response.toolCalls && response.toolCalls.length > 0) {
            console.log('SUCCESS: Tool call received!');
            console.log('Tool Name:', response.toolCalls[0].name);
            console.log('Arguments:', response.toolCalls[0].arguments);
        } else {
            console.log('FAILURE: No tool call received. (Model might not support it or decided not to call)');
        }
    } catch (error) {
        console.error('Error during chat:', error);
    }
}

testLlamaCppTools().catch(console.error);
