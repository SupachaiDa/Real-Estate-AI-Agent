import dotenv from 'dotenv';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

function prepareTextToEmbed(prop) {
  return `
Property title: ${prop.Title || 'Unknown'}.
Type: ${prop.Type || 'Not specified'}.
Condition: ${prop.New === 'Y' ? 'New property' : 'Used property'}.
Description: ${prop.Description || 'No description'}.
Floor: ${prop.Floor || 'N/A'}.
Bedrooms: ${prop.Bed_room || 'N/A'}.
Bathrooms: ${prop.Bath_room || 'N/A'}.
Price: ${prop.Price ? `${prop.Price} THB` : 'Not specified'}.
Size: ${prop.Size ? `${prop.Size} sqm` : 'Not specified'}.
Location: ${prop.Location || 'Unknown'}.
Images: ${[prop.Image_Url_1, prop.Image_Url_2, prop.Image_Url_3].filter(Boolean).join(', ') || 'No images'}.
  `;
}

async function generateEmbeddings() {
  try {
    const { data: properties, error } = await supabase
      .from('Properties')
      .select()   // fetch all columns
      .is('embedding', null) // only rows without embeddings    

    if (error) throw error;
    if (!properties.length) return console.log('✅ All properties already have embeddings.');

    for (const prop of properties) {
      const textToEmbed = prepareTextToEmbed(prop);

      // Call OpenAI API
      const res = await axios.post(
        'https://api.openai.com/v1/embeddings',
        {
          model: 'text-embedding-3-small',
          input: textToEmbed
        },
        { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` } }
      );

      const embedding = res.data.data[0].embedding;

      if (!embedding) {
        console.error(`❌ No embedding for property Id ${prop.Id}`);
        continue;
      }

      // Update embedding in Supabase
      const { error: updateError } = await supabase
        .from('Properties')
        .update({ embedding })
        .eq('Id', prop.Id);

      if (updateError) console.error(`❌ Failed to update Id ${prop.id}:`, updateError);
      else console.log(`✅ Updated embedding for Id ${prop.id}`);
    }

    console.log('✅ All embeddings generated!');
  } catch (err) {
    console.error('Error generating embeddings:', err);
  }
}

export { generateEmbeddings }
