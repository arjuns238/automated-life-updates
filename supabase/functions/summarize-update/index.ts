import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_summary, update_id } = await req.json();
    
    if (!user_summary || !update_id) {
      throw new Error('Missing required fields: user_summary or update_id');
    }

    // Simple AI-like summarization logic for now
    // In a real implementation, you would use a proper text summarization model
    const sentences = user_summary.split('.').filter(s => s.trim().length > 0);
    const keyPoints = sentences.slice(0, 3); // Take first 3 sentences as key points
    
    let aiSummary;
    if (sentences.length <= 3) {
      aiSummary = `Brief summary: ${user_summary.trim()}`;
    } else {
      aiSummary = `Key highlights: ${keyPoints.join('. ').trim()}.`;
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Update the life_updates record with AI summary
    const { data, error } = await supabase
      .from('life_updates')
      .update({ ai_summary: aiSummary })
      .eq('id', update_id)
      .select();

    if (error) {
      throw error;
    }

    console.log('Successfully generated AI summary for update:', update_id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        ai_summary: aiSummary,
        data 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error generating AI summary:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to generate AI summary' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});