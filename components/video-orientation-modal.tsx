"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Play } from "lucide-react"

interface VideoOrientationModalProps {
  isOpen: boolean
  onClose: () => void
  onOrientationSelect: (orientation: "portrait" | "landscape") => void
}

export function VideoOrientationModal({ isOpen, onClose, onOrientationSelect }: VideoOrientationModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
  {/* шире ~20% + не вылезает за вьюпорт */}
  <DialogContent className="sm:max-w-none w-[min(92vw,960px)] p-8">
    <DialogHeader className="space-y-3">
      <DialogTitle className="text-2xl font-semibold text-left">Начать с нуля</DialogTitle>
      <p className="text-muted-foreground text-left">
        Какую ориентацию вы хотите использовать для создания видео?
      </p>
    </DialogHeader>

    <div className="bg-gray-50 rounded-2xl p-10 mt-6">
      {/* центр, одинаковые колонки, нормальный зазор */}
      <div className="mx-auto max-w-[780px] grid grid-cols-1 md:grid-cols-2 justify-items-center items-stretch gap-14">
        {/* Portrait */}
        <div className="flex flex-col items-center text-center gap-6 md:min-h-[340px]">
          <h3 className="text-lg font-medium text-gray-900">Портрет</h3>
          <div className="cursor-pointer group" onClick={() => onOrientationSelect("portrait")}>
            <div className="w-32 h-48 bg-purple-50 border-2 border-dashed border-purple-400 rounded-xl flex items-center justify-center group-hover:border-purple-500 transition-colors">
              <Play className="w-8 h-8 text-purple-600 fill-purple-600" />
            </div>
          </div>
          {/* кнопки одинаковой ширины, не «слипаются» */}
          <Button
            onClick={() => onOrientationSelect("portrait")}
            className="bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-medium w-full max-w-[300px] mt-auto"
          >
            Создать портретное видео
          </Button>
        </div>

        {/* Landscape */}
        <div className="flex flex-col items-center text-center gap-6 md:min-h-[340px]">
          <h3 className="text-lg font-medium text-gray-900">Пейзаж</h3>
          <div className="cursor-pointer group" onClick={() => onOrientationSelect("landscape")}>
            <div className="w-48 h-28 bg-purple-50 border-2 border-dashed border-purple-400 rounded-xl flex items-center justify-center group-hover:border-purple-500 transition-colors">
              <Play className="w-8 h-8 text-purple-600 fill-purple-600" />
            </div>
          </div>
          <Button
            onClick={() => onOrientationSelect("landscape")}
            className="bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-medium w-full max-w-[300px] mt-auto"
          >
            Создать пейзажное видео
          </Button>
        </div>
      </div>
    </div>
  </DialogContent>
</Dialog>

  )
}
