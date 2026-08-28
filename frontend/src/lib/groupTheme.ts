export const groupThemes = {
  JKT48: { primaryColor: '#e86f61', secondaryColor: '#f2ded1', glowColor: 'rgba(232, 111, 97, .18)' },
  AKB48: { primaryColor: '#6b91bd', secondaryColor: '#dfeaf4', glowColor: 'rgba(107, 145, 189, .18)' },
  SKE48: { primaryColor: '#b47a4e', secondaryColor: '#f0e2d6', glowColor: 'rgba(180, 122, 78, .18)' },
  NMB48: { primaryColor: '#7e9f7f', secondaryColor: '#e2eee3', glowColor: 'rgba(126, 159, 127, .18)' },
  HKT48: { primaryColor: '#c58baf', secondaryColor: '#f2e2ec', glowColor: 'rgba(197, 139, 175, .18)' },
  NGT48: { primaryColor: '#7aa8a2', secondaryColor: '#e0efed', glowColor: 'rgba(122, 168, 162, .18)' },
  STU48: { primaryColor: '#658aa0', secondaryColor: '#e0ebf0', glowColor: 'rgba(101, 138, 160, .18)' },
} as const
export type GroupName = keyof typeof groupThemes
