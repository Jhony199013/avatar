"use client"

import { useState } from "react"
import { VideoOrientationModal } from "./video-orientation-modal"
import { VideoEditor } from "./video-editor"
import type { PhotoAvatar, Voice } from "@/lib/supabase"

interface MaterialCreatorProps {
  isOpen: boolean
  onClose: () => void
  avatars: PhotoAvatar[]
  voices: Voice[]
  onMaterialCreated: (videoTitle?: string) => void
}

export function MaterialCreator({ isOpen, onClose, avatars, voices, onMaterialCreated }: MaterialCreatorProps) {
  const [showOrientationModal, setShowOrientationModal] = useState(true)
  const [showEditor, setShowEditor] = useState(false)
  const [selectedOrientation, setSelectedOrientation] = useState<"portrait" | "landscape" | null>(null)

  const handleClose = () => {
    setShowOrientationModal(true)
    setShowEditor(false)
    setSelectedOrientation(null)
    onClose()
  }

  const handleOrientationSelect = (orientation: "portrait" | "landscape") => {
    setSelectedOrientation(orientation)
    setShowOrientationModal(false)
    setShowEditor(true)
  }

  const handleEditorClose = () => {
    setShowEditor(false)
    setShowOrientationModal(true)
    setSelectedOrientation(null)
  }

  return (
    <>
      <VideoOrientationModal
        isOpen={isOpen && showOrientationModal}
        onClose={handleClose}
        onOrientationSelect={handleOrientationSelect}
      />

      {selectedOrientation && (
        <VideoEditor
          isOpen={showEditor}
          onClose={handleEditorClose}
          orientation={selectedOrientation}
          avatars={avatars}
          voices={voices}
          onMaterialCreated={onMaterialCreated}
        />
      )}
    </>
  )
}
