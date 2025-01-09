import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// @deno-types="https://raw.githubusercontent.com/denoland/deno/main/cli/dts/lib.deno.ns.d.ts"
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const rawApiKey = Deno.env.get('D_ID_API_KEY') || '';
const D_ID_API_KEY = btoa(rawApiKey);
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required')
}
const D_ID_API_URL = 'https://api.d-id.com'

if (!D_ID_API_KEY) {
  throw new Error('D_ID_API_KEY environment variable is required')
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-auth',
        'Access-Control-Allow-Credentials': 'true'
      }
    })
  }

  try {
    if (req.method !== 'POST') {
      throw new Error('Method not allowed')
    }

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

    try {
      // Create Supabase client with service role key
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      })
      console.log('Supabase client created')

      // Verify the JWT token
      const { data: { user }, error: authError } = await supabase.auth.getUser(token)
      console.log('Auth response:', { user, error: authError })
      
      if (authError) {
        console.error('Auth error:', authError)
        throw new Error(`Token verification failed: ${authError.message}`)
      }
      
      if (!user) {
        throw new Error('No user found for token')
      }
    } catch (authError) {
      console.error('Auth error:', authError)
      throw new Error(`Authentication failed: ${authError.message}`)
    }

    const { script, source_url } = await req.json()
    
    if (!script) {
      throw new Error('Script is required')
    }

    console.log('Making D-ID API request with key:', D_ID_API_KEY);
    console.log('D-ID API URL:', D_ID_API_URL);
      
    // const requestBody = {
    //   source_url: source_url || "https://clips-presenters.d-id.com/amy/image.png",
    //   script: {
    //     type: "text",
    //     input: script
    //   }
    // };


    const requestBody = {
      source_url: 'https://d-id-public-bucket.s3.us-west-2.amazonaws.com/alice.jpg',
      script: {
        type: 'text',
        subtitles: 'false',
        provider: {type: 'microsoft', voice_id: 'Sara'},
        input: script
      },
      config: {fluent: 'false', pad_audio: '0.0'}
    };
    
    console.log('D-ID request body:', JSON.stringify(requestBody, null, 2));

    // const headers = {
    //   'accept': 'application/json',
    //   'content-type': 'application/json',
    //   'Authorization': `Basic ${D_ID_API_KEY}`
    // };

    const headers = {
      accept: 'application/json',
      'content-type': 'application/json',
      authorization: `Basic ${D_ID_API_KEY}`
    }
    
    console.log('Request headers:', headers);

    const createResponse = await fetch(`${D_ID_API_URL}/talks`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    console.log('D-ID API response status:', createResponse.status);
    console.log('D-ID API response headers:', Object.fromEntries(createResponse.headers.entries()));
    
    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error('D-ID API error response:', errorText);
      
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        console.error('Failed to parse error response:', e);
        errorData = { message: errorText };
      }
      
      throw new Error(`Failed to create talk: ${errorData.message || createResponse.statusText}`);
    }

    const responseData = await createResponse.text();
    console.log('D-ID API response data:', responseData);
    
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(responseData);
    } catch (e) {
      console.error('Failed to parse success response:', e);
      throw new Error('Invalid response from D-ID API');
    }

    if (!parsedResponse.id) {
      throw new Error('No talk ID in response');
    }

    // Poll for result
    let result;
    while (true) {
      const resultResponse = await fetch(`${D_ID_API_URL}/talks/${parsedResponse.id}`, {
        headers: {
          'accept': 'application/json',
          'Authorization': `Basic ${D_ID_API_KEY}`
        },
      });

      if (!resultResponse.ok) {
        const errorData = await resultResponse.json();
        throw new Error(`Failed to get talk: ${errorData.message || resultResponse.statusText}`);
      }

      result = await resultResponse.json();

      if (result.status === 'done') {
        break;
      } else if (result.status === 'error') {
        throw new Error(`Talk generation failed: ${result.error}`);
      }

      // Wait before polling again
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return new Response(
      JSON.stringify({ url: result.result_url }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  } catch (error) {
    console.error('Error in generate-video function:', error);
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
