import { createTextStreamResponse, streamText } from 'ai'

export default defineEventHandler(async (event) => {
  const form = await readFormData(event)
  const image = form.get('image') as File

  const result = streamText({
    model: 'openai/gpt-5-nano',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Describe this picture accurately. It will be used to regenerate the image later, so try to be as detailed as possible.',
          },
          {
            type: 'file',
            mediaType: image.type,
            data: await image.arrayBuffer(),
          },
        ],
      },
    ],
  })

  return createTextStreamResponse({ stream: result.textStream })
})