-- Create a table for user life updates
CREATE TABLE public.life_updates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  user_summary TEXT NOT NULL,
  ai_summary TEXT,
  photos TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.life_updates ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own updates" 
ON public.life_updates 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own updates" 
ON public.life_updates 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own updates" 
ON public.life_updates 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own updates" 
ON public.life_updates 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_life_updates_updated_at
  BEFORE UPDATE ON public.life_updates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();