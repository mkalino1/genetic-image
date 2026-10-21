import { google } from '@ai-sdk/google'
import { generateText } from 'ai'
import { z } from 'zod'

const payloadSchema = z.object({
  image: z.instanceof(File)
    .refine(file => file.size > 0, 'Image must not be empty.')
    .refine(file => file.type.startsWith('image/'), 'Image must be an image.'),
  description: z.string().trim().min(1, 'Description must not be empty.'),
})

export default defineEventHandler(async (event) => {
  const form = await readFormData(event)
  const payload = payloadSchema.safeParse({
    image: form.get('image'),
    description: form.get('description'),
  })

  if (!payload.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid request payload.',
      data: payload.error.issues.map(({ path, message }) => ({ path, message })),
    })
  }

  const { image, description } = payload.data

  const { files } = await generateText({
    model: google('gemini-3.1-flash-lite-image'),
    providerOptions: {
      google: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: { aspectRatio: '1:1' },
      },
    },
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `The image represents colors and shapes of the original image. Try to recreate the original image based on shapes and description: ${description}.`,
          },
          {
            type: 'file',
            mediaType: image.type,
            data: await image.arrayBuffer(),
          },
        ],
      },
    ],
  });

  const generatedImage = files.find(file => file.mediaType.startsWith('image/'))
  if (!generatedImage) {
    throw createError({ statusCode: 502, statusMessage: 'Gemini did not return an image.' })
  }

  setResponseHeader(event, 'Content-Type', generatedImage.mediaType)

  return generatedImage.uint8Array
});
