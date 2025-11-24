import dotenv, { parse } from "dotenv";
import axios from "axios";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

dotenv.config();

// Initialize Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const { data: chatHistory, error } = await supabase
  .from("ChatHistories")
  .select("Role, Message")
  //.order("TimeStemp", { ascending: true });

if (error) {
  console.error("Supabase error:", error);
}

const safeHistory = Array.isArray(chatHistory) ? chatHistory : [];

const historyText_global = safeHistory
  .map(h => `${h.Role}: ${h.Message}`)
  .join("\n");
 

//console.log("CHAT HISTORYYY :\n" + historyText);

// Analyze user's intent ("Consult", "Buy", "Appointment", "Sell", )
async function userIntent(userQuery, historyText_global) {
	const prompt = `
Analyze the user's message and determine their intent as follows:
1) If the message is a trivia question not related to properties → "consult"
2) If the user is looking for a property to buy → "buy"
3) If the user wants an appointment to see properties → "appointment"
4) If the user wants to sell a property → "sell"
5) If unclear → "hesitate"

Conversation history:
${JSON.stringify(historyText_global)}

Current user message:
"${userQuery}"

Your tasks:
1) Summarize the conversation history AND the latest user & AI messages into "summarize_chat".
   - The summary MUST include all relevant details from the latest user and AI responses.

2) If user_intent = "appointment":
- Extract the date and time ONLY if the user explicitly provided it.
- Convert the date and time to the EXACT format:
  **DD/MM/YYYYTHH:MM**
  Examples:
	05/01/2026T14:30

- If the user gave a time but NO date
  → Set "date_time": ""

   If the user did NOT give any date or time, return ""
   and I (the system) will ask the user for availability.

3) If user_intent is NOT "appointment":
     Always return "date_time": ""
	 
4) If user_intent = "sell":
- Name of the property -> "title"
- Type of the property -> "type"
- Condition of the property -> "If it is the new one set condition:"Y" and condition:"N" for the used one"
- A short description of the property -> "description"
- How many floors of the building or which floor of the room in case it is a condo -> "floor""
- How many bedroom -> "bedroom"
- How many bathroom -> "bathroom"
- The size of the building in square meter -> "size"
- The location of the building -> "location"
- The expected price of the seller -> "price"
If the user did NOT provide enough inforamation, I (the system) will ask the user for more details

STRICT RESPONSE RULES:
- Respond ONLY with valid JSON
- NO backticks, NO markdown, NO explanations
- Fields:
{
  "user_intent": "consult" | "buy" | "appointment" | "sell" | "hesitate",
  "summarize_chat": "text",
  "date_time": "DD/MM/YYYYTHH:MM" or "",
  "title": text,
  "type": "Villa" | "House" | "Condo",
  "condition": "Y" | "N",
  "description": text,
  "floor": int,
  "bedroom": int,
  "bathroom": int,
  "size": float,
  "location": text,
  "price": float
}
`

	const response = await axios.post(
	  "https://api.openai.com/v1/chat/completions",
	  {
		model: "gpt-4o-mini",
		messages: [{ role: "user", content: prompt }],
	  },
	  { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` } }
	);
  
	let raw = response.data.choices[0].message.content;
  
	// --- FIX MARKDOWN & SMART QUOTES ---
	let clean = raw
	  .replace(/```json/g, "")
	  .replace(/```/g, "")
	  .replace(/[“”]/g, '"')
	  .trim();
  
	let user_intent = null;
	let summarize_chat = null;
	let date_time = null;
	let title = null;
	let type = null;
	let condition = null;
	let description = null;
	let floor = null;
	let bedroom = null;
	let bathroom = null;
	let size = null;
	let location = null;
	let price = null;
  
	try {
	  const parsed = JSON.parse(clean);
	  
	 	user_intent = parsed.user_intent;
	 	summarize_chat  = parsed.summarize_chat;
	 	date_time  = parsed.date_time;
	 	title = parsed.title ?? ""
		type = parsed.type ?? ""
		condition = parsed.condition ?? ""
		description = parsed.description ?? ""
		floor = parsed.floor ?? null
		bedroom = parsed.bedroom ?? null
		bathroom = parsed.bathroom ?? null
		size = parsed.size ?? null
		location = parsed.location ?? ""
		price = parsed.price ?? null
	  
	  //console.log("user_intent:", user_intent);
	 // console.log("summarize_chat:", summarize_chat);
	 console.log("date_time :", date_time);
	 console.log("title : ", title);
	 console.log("type : ", type);
	 console.log("condition : ", condition);
	 console.log("description : ", description);
	 console.log("floor : ", floor);
	 console.log("bedroom : ", bedroom );
	 console.log("bathroom : ", bathroom );
	 console.log("size :", size);
	 console.log("location :", location);
	 console.log("price :", price);
	} catch (err) {
	  console.error("❌ JSON parse error:", err, "\nRAW:", raw, "\nCLEAN:", clean);
	}
  
	return {
		user_intent,
		summarize_chat,
		date_time,
		title,
		type,
		condition,
		description,
		floor,
		bedroom,
		bathroom,
		size,
		location,
		price
	}
  }
  

async function replyToClient(userQuery, language, userId) {
	// User's intent
	const result = await (await userIntent(userQuery, historyText_global))
	const intent = result.user_intent
	const summarize = result.summarize_chat
	const title = result.title
	const type = result.type 
	const condition = result.condition
	const description = result.description
	const floor = result.floor
	const bedroom = result.bedroom 
	const bathroom = result.bathroom
	const size = result.size
	const location = result.location
	const price = result.price
	
	console.log("💬 userIntent : " + intent)
	console.log("📝 summarize : " + summarize)
	
	let matches = []; 
	let prompt = ''
	
	switch(intent) {
		case "consult":  
		
		prompt = `
		You are a friendly and knowledgeable real estate assistant.
		Search for knowledge from the internet.
		
		The previous conversation ${summarize}
		The latest User query: "${userQuery}"
		
		Respond the query in ${language}. Keep your tone warm and helpful.
		
		`
		break;
		
		case "buy":
		
		matches = await replyImage(userQuery)
		const contextText = matches
		.map(
		  (p, i) => `
	${i + 1}. 🏡 ${p.Title}
	💰 Price: ${p.Price?.toLocaleString()} THB
	📍 Location: ${p.Location}
	📝 ${p.Description}
	`
		)
		.join("\n");
		  
			prompt = `
		You are a friendly and knowledgeable real estate assistant.
		Use the information below to recommend suitable properties to the client.
		
		The previous conversation ${summarize}
		The latest User query: "${userQuery}"
		
		Property database:
		${contextText}
		
		Respond the query in ${language}. Keep your tone warm and helpful.
		
		`
		break;	
			
		case "appointment": 
			prompt = `
		You are a friendly and knowledgeable real estate assistant.
		Ask for the date and time that the user available.
		
		The previous conversation ${summarize}
		The latest User query: "${userQuery}"
		
		
		
		Respond the query in ${language}. Keep your tone warm and helpful.
		
		`
		
		break;	
		
		case "sell":
		
		const { data, error } = await supabase
			.from("Properties")
			.insert([
			  {
				Poster: userId,
				Title: title,
				Type: type,
				New: condition,
				Description: description,
				Floor: floor,
				Bed_room: bedroom,
				Bath_room: bathroom,
				Size: size,
				Location: location,
				Price: price
			  },   
			])
			.select();
			
		
		  if (error) {
			console.error("❌ Insert Property failed:", error);
			return null;
		  }
		  console.log("✅ Inserted Property:", data);
	
		
		
		prompt = `
		You are a friendly and knowledgeable real estate assistant.
		   
		
		The previous conversation ${summarize}
		The latest User query: "${userQuery}"
		
		To make sure the user provide all of this information
		title: ${title}
		type: ${type}
		condition: ${condition}
		description: ${description}
		floor: ${floor}
		bedroom: ${bedroom}
		bathroom: ${bathroom}
		size: ${size}
		location: ${location}
		price: ${price}
		
		Respond the query in ${language}. Keep your tone warm and helpful.
		
		`
		break;
	}
	
	 // Ask ChatGPT to summarize the best answer
	 const response = await axios.post(
		"https://api.openai.com/v1/chat/completions",
		{
		  model: "gpt-4o-mini", // lightweight and fast
		  messages: [{ role: "user", content: prompt }],
		},
		{ headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` } }
	  );
	
	  console.log("Reply to the user : " + response.data.choices[0].message.content) 
	  return {
		message: response.data.choices[0].message.content,
   		img: matches,    
    	intent
	  }
}

async function replyImage(userQuery) {
	  // Step 1: Convert user query to embedding
	  const embedResponse = await axios.post(
		"https://api.openai.com/v1/embeddings",
		{
		  model: "text-embedding-3-small",
		  input: userQuery,
		},
		{ headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` } }
	  );
	
	  const queryEmbedding = embedResponse.data.data[0].embedding;
	
	  // Step 2: Query Supabase RPC function for vector match
	  const { data: matches, error } = await supabase.rpc("match_properties", {
		query_embedding: queryEmbedding,
		match_threshold: 0.7, // adjust as needed
		match_count: 5, // top N results
	  });
		
		return matches
}

export { replyToClient };