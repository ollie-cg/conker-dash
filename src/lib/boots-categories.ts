// src/lib/boots-categories.ts

export type BootsCategory = 'Haircare' | 'Styling' | 'Fragrance' | 'Gifts' | 'Minis' | 'Other'

export const CATEGORY_COLOURS: Record<BootsCategory, string> = {
  Haircare: '#3b82f6',
  Styling: '#10b981',
  Fragrance: '#8b5cf6',
  Gifts: '#f59e0b',
  Minis: '#64748b',
  Other: '#0ea5e9',
}

export const CATEGORY_BG_CLASSES: Record<BootsCategory, string> = {
  Haircare: 'bg-blue-100 text-blue-700',
  Styling: 'bg-emerald-100 text-emerald-700',
  Fragrance: 'bg-violet-100 text-violet-700',
  Gifts: 'bg-amber-100 text-amber-700',
  Minis: 'bg-slate-100 text-slate-700',
  Other: 'bg-sky-100 text-sky-700',
}

export function getBootsCategory(skuName: string): BootsCategory {
  const lower = skuName.toLowerCase()

  // Minis check first (specific size indicators)
  if (lower.includes('60ml') || lower.includes('10ml')) return 'Minis'

  // Gifts/Sets check before other categories (some sets contain category keywords)
  if (
    lower.includes(' set') ||
    lower.includes('bundle') ||
    lower.includes('duo') ||
    lower.includes('bauble') ||
    lower.includes('gift') ||
    lower.includes('collection') ||
    lower.includes('cllctn') ||
    lower.includes('discovery')
  ) return 'Gifts'

  // Fragrance
  if (
    lower.includes('edp') ||
    lower.includes('frag') ||
    lower.includes('floral') ||
    lower.includes('woods') ||
    lower.includes('bloom') ||
    lower.includes('elsie') ||
    lower.includes('elise') ||
    lower.includes('brightside') ||
    lower.includes('knd of')
  ) return 'Fragrance'

  // Styling (check before haircare since "dry shampoo" is styling)
  if (
    lower.includes('dry shamp') ||
    lower.includes('hairspray') ||
    lower.includes('veil') ||
    lower.includes('mastery') ||
    lower.includes('mousse') ||
    lower.includes('body hybrid') ||
    lower.includes('pomade') ||
    lower.includes('scene setter') ||
    lower.includes('scnsetr') ||
    lower.includes('blow dry') ||
    lower.includes('new form') ||
    lower.includes('gel') ||
    lower.includes('headliner') ||
    lower.includes('texture') ||
    lower.includes('movement')
  ) return 'Styling'

  // Haircare
  if (
    lower.includes('shampoo') ||
    lower.includes('conditioner') ||
    lower.includes('scalp scrub') ||
    lower.includes('crown') ||
    lower.includes('treatment mask') ||
    lower.includes('future youth') ||
    lower.includes('futureyouth') ||
    lower.includes('all day every') ||
    lower.includes('tad evrydy') ||
    lower.includes('all day extra') ||
    lower.includes('co-cleanser') ||
    lower.includes('co cleanser')
  ) return 'Haircare'

  return 'Other'
}

export const ALL_CATEGORIES: BootsCategory[] = ['Haircare', 'Styling', 'Fragrance', 'Gifts', 'Minis', 'Other']
