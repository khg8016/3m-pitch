import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const HEYGEN_API_KEY = Deno.env.get('HEYGEN_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required')
}

// Create Supabase client with service role key
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

interface WebhookData {
  event_type: 'avatar_video.success' | 'avatar_video.fail';
  event_data: {
    video_id: string;
    url?: string;
    msg?: string;
    callback_id?: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'content-type',
        'Access-Control-Allow-Credentials': 'true'
      }
    })
  }

  try {
    if (req.method !== 'POST') {
      throw new Error('Method not allowed')
    }

    const webhookData: WebhookData = await req.json()
    console.log('Received webhook data:', webhookData)
    if (webhookData.event_type !== 'avatar_video.success' && webhookData.event_type !== 'avatar_video.fail') {
      return
    }
    // Update heygen video record in database
    const { error } = await supabaseAdmin
      .from('heygen_videos')
      .update({
        status: (webhookData.event_type === 'avatar_video.success') ? 'completed' : 'failed',
        video_url: webhookData.event_data.url,
        updated_at: new Date().toISOString()
      })
      .eq('video_id', webhookData.event_data.video_id)

    if (error) {
      throw error
    }

    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    )
  } catch (error) {
    console.error('Error in heygen-webhook function:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    )
  }
})
