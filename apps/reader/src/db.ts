import { PackagingMetadataObject } from '@flow/epubjs/types/packaging'

import { Annotation } from './annotation'
import { TypographyConfiguration } from './state'

export interface FileRecord {
  id: string
  file: File
}

export interface CoverRecord {
  id: string
  cover: string | null
}

export interface BookRecord {
  id: string
  name: string
  size: number
  metadata: PackagingMetadataObject
  createdAt: number
  updatedAt?: number
  cfi?: string
  percentage?: number
  definitions: string[]
  annotations: Annotation[]
  configuration?: {
    typography?: TypographyConfiguration
  }
  /** Set after uploading cover to Firebase Storage; used for library grid */
  coverUrl?: string
}
