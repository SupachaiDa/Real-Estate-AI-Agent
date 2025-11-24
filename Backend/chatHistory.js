import dotenv from "dotenv";
import axios from "axios";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export async function createChatEntry( userId, userQuery, reply ) {
	
	console.log(userId, userQuery, reply)
	
const { data } = await supabase
    .from("ChatHistories")
    .insert([
      {
        ChatId: userId,
        Role: "user",  
		TimeStemp: new Date(),     
        Message: userQuery,
      },   
    ])
    .select();
	
  const { data1, error } = await supabase
    .from("ChatHistories")
    .insert([
      {
        ChatId: userId,
        Role: "ai",  
		TimeStemp: new Date(),     
        Message: reply,
      },   
    ])
    .select();
	

  if (error) {
    console.error("❌ Insert failed:", error);
    return null;
  }

  console.log("✅ Inserted:", data);
  return {data, data1};
}

