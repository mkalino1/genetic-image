import { createTextStreamResponse, streamText } from 'ai'
import { z } from 'zod'

const payloadSchema = z.object({
  image: z.instanceof(File)
    .refine(file => file.size > 0, 'Image must not be empty.')
    .refine(file => file.type.startsWith('image/'), 'Image must be an image.'),
})

export default defineEventHandler(async (event) => {
  const form = await readFormData(event)
  const payload = payloadSchema.safeParse({
    image: form.get('image'),
  })

  if (!payload.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid request payload.',
      data: payload.error.issues.map(({ path, message }) => ({ path, message })),
    })
  }

  const { image } = payload.data

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