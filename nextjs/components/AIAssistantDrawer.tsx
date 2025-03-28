// components/AIAssistantDrawer.tsx

'use client';

import { Bot, User } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import { Button } from "@/components/ui/button";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { Input } from "@/components/ui/input";
import { createMCPClient } from "@/lib/mcp-client";
import { useState } from "react";

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export default function AIAssistantDrawer() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [client, setClient] = useState<Client | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Initialize client when drawer opens
  const handleDrawerOpen = async () => {
    if (client) return; // Already initialized

    const cosmosDBMcpClient = await createMCPClient();
    if (cosmosDBMcpClient) {
      setClient(cosmosDBMcpClient);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !client) return;

    const userMessage: Message = { role: 'user', content: message };
    setMessages(prev => [...prev, userMessage]);
    setMessage('');

    try {
      const toolsData = await client.listTools();

      // transform mcp tools into openai format
      const openAITools = toolsData.tools.map((tool) => ({
        type: "function" as const,
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.inputSchema,
          strict: false,
        },
      }));
      console.log("openAI tools", openAITools);

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          conversationHistory: messages,
          tools: openAITools,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const r = await response.json();
      const result = JSON.parse(r.content);

      // Handle tool calls if present
      if (result.choices[0].finish_reason === 'tool_calls') {
        const toolCalls = result.choices[0].message.tool_calls;
        for (const toolCall of toolCalls) {
          // console.log("function name: ", toolCall.function.name);
          // console.log("args", JSON.parse(toolCall.function.arguments));
          const toolResult = await client.callTool({
            name: toolCall.function.name,
            arguments: JSON.parse(toolCall.function.arguments)
          });

          // Add tool response as assistant message
          const toolResponseMessage: Message = {
            role: 'assistant',
            content: JSON.stringify(toolResult)
          };
          setMessages(prev => [...prev, toolResponseMessage]);
        }
      } else if (result.choices[0].message.content) {

        // Handle normal message response
        const assistantMessage: Message = {
          role: 'assistant',
          content: result.choices[0].message.content
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (e) {
      console.error(e);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request.'
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) handleDrawerOpen();
  };

  return (
    <Sheet 
      modal={false} 
      open={isOpen}
      onOpenChange={handleOpenChange}
    >
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="p-2 hover:bg-gray-100 rounded-full">
          <Bot className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent 
        className="w-[400px] sm:w-[540px]"
        onInteractOutside={(e) => {
          const target = e.target as HTMLElement;
          if (!target.closest('[data-state="closed"]')) {
            e.preventDefault();
          }
        }}
      >
        <SheetHeader>
          <SheetTitle>AI Shopping Assistant</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col h-[calc(100vh-8rem)]">
          <div className="flex-1 overflow-y-auto mb-4 p-4 bg-gray-50 rounded-lg">
            {messages.length === 0 ? (
              <p className="text-gray-500 text-center mt-4">
                Ask me anything about our products!
              </p>
            ) : (
              <div className="space-y-4">
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-2 ${
                      msg.role === 'assistant' ? 'flex-row' : 'flex-row-reverse'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                      {msg.role === 'assistant' ? (
                        <Bot className="h-5 w-5" />
                      ) : (
                        <User className="h-5 w-5" />
                      )}
                    </div>
                    <div
                      className={`rounded-lg p-3 max-w-[80%] ${
                        msg.role === 'assistant'
                          ? 'bg-white border'
                          : 'bg-blue-500 text-white'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1"
            />
            <Button type="submit">Send</Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}