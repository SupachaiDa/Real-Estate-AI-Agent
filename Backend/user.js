import dotenv, { parse } from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

// Initialize Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function createUser(id, name) {
	const { data, error } = await supabase
  .from("Profiles")
  .insert([
    {
		user_id: id,
		name: name
    },
  ])
  .select();

if (error) {
  console.error("❌ Insert Property failed:", error);
  return null;
}
}

async function getUser(id) { 
	const { data } = await supabase
	.from("Profiles")
	.select(`
		id,
		name,
		appointment,
		selling_property_id,
		buying_property_id,
		user_id
	`)
	.eq("user_id", id);
	
	return data
}

async function updateUser(id, name) { 
	const { data1, error1 } = await supabase
			.from("Profiles")
			.update([
			  {
				name: name,
			  },   
			])
			.eq("user_id", id);
			
			console.log("The name is updated to ", name)
			
		
		  if (error1) {
			console.error("❌ Updated name failed:", error1);
			return null;
		  }
}


export { createUser, getUser, updateUser }