import { generateText } from 'ai';

export default defineEventHandler(async (event) => {

  const form = await readFormData(event)
  const drawing = form.get('drawing') as File
  const drawingArrayBuffer = await drawing.arrayBuffer()

  const { text, usage, finishReason } = await generateText({
    model: 'openai/gpt-5-nano',
    prompt: [{
      role: 'user',
      content: 'Describe this picture.',
    }, {
      role: 'user',
      content: [{
        type: 'image',
        image: drawingArrayBuffer,
      }],
    }],
  })

  // console.log(usage);
  // console.log(finishReason);

  return text
})