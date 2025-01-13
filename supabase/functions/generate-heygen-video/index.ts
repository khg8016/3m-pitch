import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// @deno-types="https://raw.githubusercontent.com/denoland/deno/main/cli/dts/lib.deno.ns.d.ts"
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const HEYGEN_API_KEY = Deno.env.get('HEYGEN_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required')
}
const HEYGEN_API_URL = 'https://api.heygen.com'

if (!HEYGEN_API_KEY) {
  throw new Error('HEYGEN_API_KEY environment variable is required')
}

// Create Supabase client with service role key
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-auth',
        'Access-Control-Allow-Credentials': 'true'
      }
    })
  }

  try {
    // Get the JWT token from headers
    const authHeader = req.headers.get('Authorization')
    const supabaseAuthHeader = req.headers.get('x-supabase-auth')
    console.log('Auth headers:', { authHeader, supabaseAuthHeader })
    
    if (!authHeader && !supabaseAuthHeader) {
      throw new Error('Missing authorization headers')
    }

    // Try both tokens
    const token = (authHeader?.replace('Bearer ', '') || supabaseAuthHeader || '').trim()
    console.log('Using token:', token)

    if (!token) {
      throw new Error('Invalid token format')
    }

    // Verify the JWT token
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    console.log('Auth response:', { user, error: authError })
    
    if (authError) {
      console.error('Auth error:', authError)
      throw new Error(`Token verification failed: ${authError.message}`)
    }
    
    if (!user) {
      throw new Error('No user found for token')
    }

    const url = new URL(req.url);
    const videoId = url.searchParams.get('video_id');

    // GET request for checking video status
    if (req.method === 'GET' && videoId) {
      console.log('Checking video status for:', videoId);

      // Get video status from database
      const { data: videoData, error: dbError } = await supabaseAdmin
        .from('heygen_videos')
        .select('status, video_url')
        .eq('video_id', videoId)
        .single();

      if (dbError) {
        throw dbError;
      }

      if (!videoData) {
        throw new Error('Video not found');
      }

      const status = videoData.status || 'pending';
      const pollingUrl = `${SUPABASE_URL}/functions/v1/generate-heygen-video?video_id=${videoId}`;

      return new Response(
        JSON.stringify({
          data: {
            video_id: videoId,
            status: status,
            video_url: status === 'completed' ? videoData.video_url : null,
            polling_url: status !== 'completed' ? pollingUrl : null,
            polling_interval: 15000, // 15초마다 폴링
            message: status === 'completed' 
              ? 'Video is ready'
              : status === 'failed'
                ? 'Video generation failed'
                : 'Video is still processing. Please check again in 15 seconds.'
          }
        }),
        { 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        },
      );
    }

    // POST request for generating video
    if (req.method === 'POST') {
      const { script, language } = await req.json()
      
      if (!script) {
        throw new Error('Script is required')
      }
      if (!language) {
        throw new Error('Language is required')
      }

      console.log('Making Heygen API request');
      console.log('Heygen API URL:', HEYGEN_API_URL);
        
      // Create heygen video record in database
      const { data: videoRecord, error: insertError } = await supabaseAdmin
        .from('heygen_videos')
        .insert({
          video_id: null, // will be updated after video generation
          status: 'pending',
          script: script,
          user_id: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      const requestBody = {
        title: 'Generated Avatar Video',
        caption: true,
        dimension: {
          "width": 720,
          "height": 1280
        },
        callback_url: `${SUPABASE_URL}/functions/v1/heygen-webhook`,
        video_inputs: [
          {
            character: {
              type: 'avatar',
              avatar_id: 'Brent_sitting_office_front',
              scale: 1,
              avatar_style: 'normal',
              offset: {
                x: 0,
                y: 0,
              },
            },
            voice: {
              type: 'text',
              voice_id: language == 'Korean' ? '9d81087c3f9a45df8c22ab91cf46ca89' : '1985984feded457b9d013b4f6551ac94',
              input_text: script,
              speed: 1.0,
              pitch: 0,
            },
            background: {
              type: 'color',
              value: '#FFFFFF',
            },
          },
        ]
      };
      
      console.log('Request body:', JSON.stringify(requestBody, null, 2));

      const headers = {
        'accept': 'application/json',
        'content-type': 'application/json',
        'X-Api-Key': HEYGEN_API_KEY
      };
      console.log('Request headers:', headers);

      const createResponse = await fetch(`${HEYGEN_API_URL}/v2/video/generate`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      console.log('Heygen API response status:', createResponse.status);
      console.log('Heygen API response headers:', Object.fromEntries(createResponse.headers.entries()));
      
      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error('Heygen API error response:', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          console.error('Failed to parse error response:', e);
          errorData = { message: errorText };
        }
        
        throw new Error(`Failed to generate video: ${errorData.message || createResponse.statusText}`);
      }

      const responseData = await createResponse.text();
      console.log('Heygen API response data:', responseData);
      
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(responseData);
      } catch (e) {
        console.error('Failed to parse success response:', e);
        throw new Error('Invalid response from Heygen API');
      }

      if (!parsedResponse.data?.video_id) {
        throw new Error('No video ID in response');
      }

      // Update video record with video_id
      const { error: updateError } = await supabaseAdmin
        .from('heygen_videos')
        .update({
          video_id: parsedResponse.data.video_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', videoRecord.id);

      if (updateError) {
        throw updateError;
      }

      const pollingUrl = `${SUPABASE_URL}/functions/v1/generate-heygen-video?video_id=${parsedResponse.data.video_id}`;

      return new Response(
        JSON.stringify({ 
          video_id: parsedResponse.data.video_id,
          polling_url: pollingUrl,
          polling_interval: 15000 // 15초마다 폴링
        }),
        { 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        },
      );
    }

    throw new Error('Method not allowed');
  } catch (error) {
    console.error('Error in generate-heygen-video function:', error);
    const status = error.message?.includes('Unauthorized') ? 401 : 500;
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack
      }),
      { 
        status,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  }
})
