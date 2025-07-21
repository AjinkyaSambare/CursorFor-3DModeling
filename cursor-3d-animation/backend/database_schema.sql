-- Database Schema for AI-Powered Educational Animation Platform
-- This script sets up the complete database schema with user authentication,
-- projects, scenes, and proper Row Level Security (RLS)

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    display_name text,
    avatar_url text,
    preferences jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Projects table with user ownership
CREATE TABLE IF NOT EXISTS projects (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    description text,
    settings jsonb DEFAULT '{}',
    is_public boolean DEFAULT false,
    scene_count integer DEFAULT 0,
    total_duration integer DEFAULT 0,
    thumbnail_url text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Scenes table with user and project relationships
CREATE TABLE IF NOT EXISTS scenes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    project_id uuid REFERENCES projects ON DELETE CASCADE,
    prompt text NOT NULL,
    enhanced_prompt text,
    original_prompt text,
    library text DEFAULT 'manim' CHECK (library IN ('manim', 'threejs', 'p5js')),
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'generating_code', 'rendering', 'completed', 'failed')),
    duration integer DEFAULT 5 CHECK (duration >= 1 AND duration <= 30),
    resolution text DEFAULT '1080p' CHECK (resolution IN ('720p', '1080p', '4K')),
    local_video_path text,
    local_thumbnail_path text,
    video_url text,
    thumbnail_url text,
    generated_code text,
    metadata jsonb DEFAULT '{}',
    error_message text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Export jobs table for tracking video exports
CREATE TABLE IF NOT EXISTS export_jobs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    project_id uuid REFERENCES projects ON DELETE CASCADE,
    scene_ids uuid[] NOT NULL,
    format text DEFAULT 'mp4' CHECK (format IN ('mp4', 'webm', 'gif')),
    resolution text DEFAULT '1080p' CHECK (resolution IN ('720p', '1080p', '4K')),
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    output_path text,
    output_url text,
    settings jsonb DEFAULT '{}',
    error_message text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Shared projects table for collaboration
CREATE TABLE IF NOT EXISTS project_shares (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id uuid REFERENCES projects ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    shared_by uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    permission text DEFAULT 'viewer' CHECK (permission IN ('viewer', 'editor', 'admin')),
    created_at timestamptz DEFAULT now(),
    UNIQUE(project_id, user_id)
);

-- User preferences and settings
CREATE TABLE IF NOT EXISTS user_settings (
    user_id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    theme text DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
    default_library text DEFAULT 'manim' CHECK (default_library IN ('manim', 'threejs', 'p5js')),
    default_resolution text DEFAULT '1080p' CHECK (default_resolution IN ('720p', '1080p', '4K')),
    auto_enhance_prompts boolean DEFAULT true,
    email_notifications boolean DEFAULT true,
    preferences jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scenes_user_id ON scenes(user_id);
CREATE INDEX IF NOT EXISTS idx_scenes_project_id ON scenes(project_id);
CREATE INDEX IF NOT EXISTS idx_scenes_status ON scenes(status);
CREATE INDEX IF NOT EXISTS idx_scenes_created_at ON scenes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_export_jobs_user_id ON export_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_export_jobs_status ON export_jobs(status);
CREATE INDEX IF NOT EXISTS idx_project_shares_user_id ON project_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_project_shares_project_id ON project_shares(project_id);

-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles table
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for projects table
CREATE POLICY "Users can view own projects" ON projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view shared projects" ON projects FOR SELECT USING (
    auth.uid() IN (
        SELECT user_id FROM project_shares WHERE project_id = projects.id
    ) OR is_public = true
);
CREATE POLICY "Users can insert own projects" ON projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own projects" ON projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can update shared projects with edit permission" ON projects FOR UPDATE USING (
    auth.uid() IN (
        SELECT user_id FROM project_shares 
        WHERE project_id = projects.id AND permission IN ('editor', 'admin')
    )
);
CREATE POLICY "Users can delete own projects" ON projects FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for scenes table
CREATE POLICY "Users can view own scenes" ON scenes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view scenes from shared projects" ON scenes FOR SELECT USING (
    project_id IN (
        SELECT id FROM projects WHERE user_id = auth.uid() OR is_public = true
    ) OR project_id IN (
        SELECT project_id FROM project_shares WHERE user_id = auth.uid()
    )
);
CREATE POLICY "Users can insert own scenes" ON scenes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own scenes" ON scenes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own scenes" ON scenes FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for export_jobs table
CREATE POLICY "Users can view own export jobs" ON export_jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own export jobs" ON export_jobs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own export jobs" ON export_jobs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own export jobs" ON export_jobs FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for project_shares table
CREATE POLICY "Users can view shares for their projects" ON project_shares FOR SELECT USING (
    auth.uid() = shared_by OR auth.uid() = user_id
);
CREATE POLICY "Users can share their own projects" ON project_shares FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT user_id FROM projects WHERE id = project_id)
);
CREATE POLICY "Users can update shares for their projects" ON project_shares FOR UPDATE USING (
    auth.uid() IN (SELECT user_id FROM projects WHERE id = project_id)
);
CREATE POLICY "Users can delete shares for their projects" ON project_shares FOR DELETE USING (
    auth.uid() IN (SELECT user_id FROM projects WHERE id = project_id)
);

-- RLS Policies for user_settings table
CREATE POLICY "Users can view own settings" ON user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON user_settings FOR UPDATE USING (auth.uid() = user_id);

-- Create functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scenes_updated_at BEFORE UPDATE ON scenes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_export_jobs_updated_at BEFORE UPDATE ON export_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create user profile after signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, display_name)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
    );
    
    INSERT INTO public.user_settings (user_id)
    VALUES (NEW.id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile and settings on user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update scene count in projects
CREATE OR REPLACE FUNCTION update_project_scene_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE projects 
        SET scene_count = scene_count + 1,
            total_duration = total_duration + NEW.duration
        WHERE id = NEW.project_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE projects 
        SET scene_count = scene_count - 1,
            total_duration = total_duration - OLD.duration
        WHERE id = OLD.project_id;
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE projects 
        SET total_duration = total_duration - OLD.duration + NEW.duration
        WHERE id = NEW.project_id;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update project statistics
CREATE TRIGGER update_project_stats
    AFTER INSERT OR UPDATE OR DELETE ON scenes
    FOR EACH ROW EXECUTE FUNCTION update_project_scene_count();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;