import { PostgrestSingleResponse, PostgrestResponse } from "@supabase/supabase-js";

export async function fetchSingle<T>(query: any): Promise<PostgrestSingleResponse<T>> {
  try {
    const response = await query;
    return response;
  } catch (error) {
    console.error("Error in fetchSingle:", error);
    throw error;
  }
}

export async function fetchMany<T>(query: any): Promise<PostgrestResponse<T>> {
  try {
    const response = await query;
    return response;
  } catch (error) {
    console.error("Error in fetchMany:", error);
    throw error;
  }
}
