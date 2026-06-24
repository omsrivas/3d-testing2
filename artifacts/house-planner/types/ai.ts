import type { HouseProject } from "./house";
import type { FurnitureSuggestion } from "./furniture";

export type AIProvider = "openai" | "anthropic" | "gemini";

export interface AIPromptMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LayoutGenerationRequest {
  prompt: string;
  constraints: LayoutConstraints;
  existingProject?: Partial<HouseProject>;
}

export interface LayoutConstraints {
  totalArea?: number;
  bedrooms: number;
  bathrooms: number;
  stories?: number;
  style?: string;
  budget?: number;
  mustHaveRooms?: string[];
  avoidFeatures?: string[];
}

export interface LayoutGenerationResponse {
  success: boolean;
  project?: Partial<HouseProject>;
  suggestions?: string[];
  error?: string;
  tokensUsed?: number;
}

export interface FurnitureSuggestionRequest {
  roomId: string;
  roomType: string;
  roomArea: number;
  budget?: number;
  style?: string;
  existingFurnitureIds?: string[];
}

export interface FurnitureSuggestionResponse {
  success: boolean;
  suggestions: FurnitureSuggestion[];
  explanation?: string;
  error?: string;
}

export interface AIConversationMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  metadata?: {
    tokensUsed?: number;
    model?: string;
    attachedProjectSnapshot?: boolean;
  };
}

export interface AIConversation {
  id: string;
  projectId: string;
  messages: AIConversationMessage[];
  createdAt: string;
  updatedAt: string;
}
