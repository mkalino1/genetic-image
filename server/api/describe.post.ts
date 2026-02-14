import { generateText } from 'ai';

export default defineEventHandler(async (event) => {

  const form = await readFormData(event)
  const image = form.get('image') as File
  const imageArrayBuffer = await image.arrayBuffer()

  const { text } = await generateText({
    model: 'openai/gpt-5-nano',
    prompt: [{
      role: 'user',
      content: 'Describe this picture accurately. It will be used to regenerate the image later, so try to be as detailed as possible.',
    }, {
      role: 'user',
      content: [{
        type: 'image',
        image: imageArrayBuffer,
      }],
    }],
  })

  return text
})