'use server'

import { db } from '@/db'
import { risksAndOpps } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

export async function createRiskOrOpp(formData: FormData) {
  const type = formData.get('type') as string
  const productIdRaw = formData.get('productId') as string
  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const status = formData.get('status') as string

  const productId = productIdRaw && productIdRaw !== '' ? parseInt(productIdRaw, 10) : null

  await db.insert(risksAndOpps).values({
    type,
    productId,
    title,
    description,
    status,
  })

  revalidatePath('/risks')
}

export async function updateRiskOrOpp(id: number, formData: FormData) {
  const type = formData.get('type') as string
  const productIdRaw = formData.get('productId') as string
  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const status = formData.get('status') as string

  const productId = productIdRaw && productIdRaw !== '' ? parseInt(productIdRaw, 10) : null

  await db
    .update(risksAndOpps)
    .set({
      type,
      productId,
      title,
      description,
      status,
      updatedAt: new Date(),
    })
    .where(eq(risksAndOpps.id, id))

  revalidatePath('/risks')
}

export async function deleteRiskOrOpp(id: number) {
  await db.delete(risksAndOpps).where(eq(risksAndOpps.id, id))
  revalidatePath('/risks')
}
