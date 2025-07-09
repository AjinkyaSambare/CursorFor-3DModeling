export enum AnimationLibrary {
  THREEJS = "threejs",
  MANIM = "manim",
  P5JS = "p5js"
}

export enum SceneStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  GENERATING_CODE = "generating_code",
  RENDERING = "rendering",
  COMPLETED = "completed",
  FAILED = "failed"
}

export enum Resolution {
  HD = "720p",
  FULL_HD = "1080p",
  ULTRA_HD = "4K"
}

export interface SceneRequest {
  prompt: string;
  library?: AnimationLibrary;
  duration?: number;
  resolution?: Resolution;
  style?: Record<string, any>;
}

export interface Scene {
  id: string;
  prompt: string;
  library: AnimationLibrary;
  duration: number;
  resolution: Resolution;
  status: SceneStatus;
  generated_code?: string;
  video_path?: string;
  thumbnail_path?: string;
  metadata: Record<string, any>;
  error?: string;
  created_at: string;
  updated_at: string;
}

export interface SceneResponse {
  id: string;
  status: SceneStatus;
  message: string;
  video_url?: string;
  code?: string;
  error?: string;
}

export interface SceneListResponse {
  scenes: Scene[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  scenes: string[];
  timeline: any[];
  created_at: string;
  updated_at: string;
}

export interface ProjectRequest {
  name: string;
  description?: string;
  scenes?: string[];
}