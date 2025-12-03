import dotenv, { parse } from "dotenv";
import axios from "axios";
import { createClient } from "@supabase/supabase-js";

import {generateEmbeddings} from "./generateEmbeddings.js"


dotenv.config();

// Initialize Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Add this function to your file
async function fetchUserHistory(userId) {
  // 1. Fetch History
  const { data: chatHistory, error } = await supabase
    .from("ChatHistories")
    .select("Role, Message, intent, id, Property_Id")
    .order("id", { ascending: false })
    .eq("ChatId", userId) // ⚠️ Make sure this column name matches your DB exactly
    .limit(10);

  if (error) {
    console.error("Supabase error:", error);
  }

  const safeHistory = chatHistory ?? [];

  // 2. Process History Strings
  const historyText = safeHistory
    .map(h => `${h.id} : ${h.Role} : ${h.intent} : ${h.Property_Id} : ${h.Message}`)
    .join("\n");

  const historyPropertyIds = safeHistory.map(h => Number(h.Property_Id ?? 0));
  const intentHistory = safeHistory.map(h => String(h.intent ?? ""));

  console.log(historyPropertyIds, intentHistory);

  // 3. Check for "sell" intent and fetch property details
  let insertedProperty = null;

  if (intentHistory[0] === 'sell' || intentHistory[0] === 'sellInprogress') {
    const { data: dataInsertedProperty, error: errorInsertedProperty } = await supabase
      .from("Properties_temp")
      .select(`
        Id, Title, Type, New, Description, Floor, 
        Bed_room, Bath_room, Price, Size, Location
      `)
      .eq("Id", historyPropertyIds[0]);

    if (errorInsertedProperty) {
      console.error("Supabase errorInsertedProperty:", errorInsertedProperty);
    } else {
      insertedProperty = dataInsertedProperty;
    }
  }

  // 4. RETURN the values so other functions can use them
  return {
    historyText,       
    insertedProperty,  
    intentHistory,
	historyPropertyIds      
  };
}

// Analyze user's intent ("Consult", "Buy", "Appointment", "Sell", )
async function userIntent(userQuery, userId, language) {
	const result = await fetchUserHistory(userId)
	const historyText = result.historyText
	const insertedProperty = result.insertedProperty
	
	console.log("DATA:", insertedProperty);

	let nullColumns = null
	const row = insertedProperty?.[0];
  
	if (row) {
	  nullColumns = Object.keys(row).filter(key => row[key] === null || row[key] === '' || row[key] === 0);
	}
	
	const prompt = `
Analyze the user's message and determine their intent as follows in ${language} language:
1) If the message is a trivia question not related to properties → "consult"
2) If the user is looking for a property to buy → "buy"
3) If the user wants an appointment to see properties → "appointment"
4) If the user wants to sell a property → "sell"
5) If the user wants to sell a property from the previous chat and did not fill in all of the required information → "sellInprogress"
6) If unclear → "hesitate"

Conversation history:
${JSON.stringify(historyText)}
The Conversation history guideline:
id -> you can check the sequence of the message from here : Role -> you can check whether the message has been sent from user or ai : intent -> the intent of the message : Message

Current user message:
"${userQuery}"

Your tasks:
1) Summarize the conversation history AND the latest user & AI messages into "summarize_chat".
   - The summary MUST include all relevant details from the latest user and AI responses.
   - If the intent is "appointment" you need to summerize by always including the title of property that the user selected
   - If the intent is "buy" and their message is interested feel + property name you need to summerize by always including the title of property that the user interested

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
	 
4) If user_intent = "sell" or "sellInprogress":
- Name of the property -> "title"
- Type of the property -> "type"
- Condition of the property -> "If it is the new one set condition:"Y" and condition:"N" for the used one"
- A short description of the property. You can pick up the details from Conversation history -> "description"
- How many floors of the building or which floor of the room in case it is a condo -> "floor""
- How many bedroom -> "bedroom"
- How many bathroom -> "bathroom"
- The size of the building in square meter -> "size"
- The location of the building -> "location"
- The expected price of the seller -> "price"
If the user did NOT provide enough inforamation, I (the system) will ask the user for more details
Check the missing information from ${nullColumns}

STRICT RESPONSE RULES:
- Respond ONLY with valid JSON
- NO backticks, NO markdown, NO explanations
- Fields:
{
  "user_intent": "consult" | "buy" | "appointment" | "sell" | "sellInprogress" | "hesitate",
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
		price,
		nullColumns
	}
  }
  

async function replyToClient(userQuery, language, userId) {
	// User's intent
	const resultHistory = await fetchUserHistory(userId)
	const historyText = resultHistory.historyText
	console.log(historyText)
	const result = await userIntent(userQuery, userId, language)
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
	const nullColumns = result.nullColumns
	
	const appointment = result.date_time
	
	console.log("💬 userIntent : " + intent)
	console.log("📝 summarize : " + summarize)
	
	let matches = []; 
	let prompt = ''
	let property_id = 0
	
	switch(intent) {
		case "consult":  
		
		prompt = `
		You are a friendly and knowledgeable real estate assistant.
		Search for knowledge from the internet.dzfs
		
		The previous conversation ${summarize}
		The latest User query: "${userQuery}"
		
		Respond the query in ${language}. Keep your tone warm and helpful.
		
		`
		break;
		
		case "buy":
		
		matches = await replyImage(userQuery,5)
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
		matches = await replyImage(summarize,1)
		
		property_id  = matches
		.map(
			h => Number(h.Id ?? 0)
		)
		.join("\n");
		
		console.log("PPT ID : ", property_id )
		
		console.log("USER ID for update appointment : ", userId)
		const { dataAppointment, errorAppointment } = await supabase
			.from("Profiles")
			.update([
			  {
				appointment: appointment,
				buying_property_id: int(property_id)
			  },   
			])
			.eq("user_id", userId);
			
		
		  if (errorAppointment ) {
			console.error("❌ Updated user's appointment failed:", errorAppointment);
			return null;
		  }
		  console.log("✅ Updated user's appointment:", dataAppointment);
		
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
  .from("Properties_temp")
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

const newId = data?.[0]?.Id;

console.log("📌 New Property ID:", newId);

property_id = newId
		
		
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
		
		case "sellInprogress":
			
		 property_id = resultHistory.historyPropertyIds[0];

// Update Properties_temp
const { data: updatedTemp, error: updateTempError } = await supabase
  .from("Properties_temp")
  .update({
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
  })
  .eq("Id", property_id)
  .select();

if (updateTempError) {
  console.error("❌ Updated Property failed:", updateTempError);
  return null;
}

console.log("✅ Updated Property:", updatedTemp);

// Update Profiles
const { data: profileData, error: profileError } = await supabase
  .from("Profiles")
  .update({ selling_property_id: property_id })
  .eq("user_id", userId);

if (profileError) {
  console.error("❌ Update Profile failed:", profileError);
  return null;
}

//console.log("nullColumns: ", nullColumns)

// Check null columns
if (!nullColumns || nullColumns.length === 0) {
  // Select from Properties_temp
  const { data: tempRow, error: tempError } = await supabase
  .from("Properties_temp")
  .select(`
    Poster, Title, Type, New, Description, Floor, Bed_room, 
    Bath_room, Size, Location, Price, Image_Url_1, Image_Url_2, Image_Url_3
  `)
  .eq("Id", property_id)
  .maybeSingle();

if (!tempRow) {
  console.error("❌ No Properties_temp row found for ID:", property_id);
  return null;
}

  // Insert into Properties
  const { data: inserted, error: insertError } = await supabase
    .from("Properties")
    .insert({
	  Id: property_id,
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
      Price: price,
      Image_Url_1: tempRow.Image_Url_1,
      Image_Url_2: tempRow.Image_Url_2,
      Image_Url_3: tempRow.Image_Url_3
    })
    .select();

  if (insertError) {
    console.error("❌ Insert Properties failed:", insertError);
    return null;
  }

  console.log("✅ Property inserted:", inserted);
  
 generateEmbeddings()
}

		
		
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
    	intent,
		property_id
	  }
}

async function replyImage(userQuery, match_no) {
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
	  match_threshold: 0.7,
	  match_count: match_no,
	});
  
	if (error) {
	  console.error("❌ Supabase RPC ERROR:", error);
	  return [];  // <-- ensure safe fallback
	}
  
	if (!matches) {
	  console.warn("⚠️ No matches returned (null). Returning empty array.");
	  return [];
	}
  
	return matches;
  }
  
async function uploadedImg(userId, imgUrl) {
	const result = await fetchUserHistory(userId)
	const property_id = result.historyPropertyIds[0] 
	
	// 1. Fetch the current image_count
const { data: currentData, error: selectError } = await supabase
.from("Properties_temp")
.select("image_count")
.eq("Id", property_id)
.single(); // Use .single() as you expect one property

if (selectError || !currentData) {
console.error("Error fetching current image count:", selectError);
// Handle the error (e.g., return or set a default count)
return;
}

const currentImageCount = currentData.image_count || 0;
let newImageCount = currentImageCount + 1;

if (newImageCount > 3) {
  newImageCount = 1;
}

// 1. Build dynamic update payload
const updateObj = {
  image_count: newImageCount
};

// Add the key Image_Url_1/2/3 dynamically
updateObj[`Image_Url_${newImageCount}`] = imgUrl;

// 2. Perform Supabase Update
const { data: updatedData, error: updateError } = await supabase
  .from("Properties_temp")
  .update(updateObj)
  .eq("Id", property_id)
  .select();

if (updateError) {
  console.error("Supabase Update Error:", updateError);
} else {
  console.log("Updated Row Data:", updatedData);
}

			
}


export { replyToClient, fetchUserHistory, uploadedImg };