import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { RotatingSpeakers } from '@/components/ui/rotating-speakers'
import { RotatingSpeakersMobile } from '@/components/ui/rotating-speakers-mobile'
import { RotatingSpeakersSemicircle } from '@/components/ui/rotating-speakers-semicircle'
import { LivingConstellation } from '@/components/ui/living-constellation'
import { speakers } from '@/data/speakers'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { ExportDialog } from '@/components/ExportDialog'
import { ArrowLeft, Code } from 'lucide-react'
import rotatingSpeakersSource from '@/components/ui/rotating-speakers.tsx?raw'
import rotatingSpeakersMobileSource from '@/components/ui/rotating-speakers-mobile.tsx?raw'
import rotatingSpeakersSemicircleSource from '@/components/ui/rotating-speakers-semicircle.tsx?raw'
import livingConstellationSource from '@/components/ui/living-constellation.tsx?raw'
import speakersDataSource from '@/data/speakers.ts?raw'

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(`(max-width: ${breakpoint}px)`).matches)
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint}px)`)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [breakpoint])
  return isMobile
}

const RING_LABELS = ['Inner ring', 'Middle ring', 'Outer ring']

export default function RotatingSpeakersDetail() {
  const navigate = useNavigate()
  const [exportOpen, setExportOpen] = useState(false)
  const isMobile = useIsMobile(1024)
  const [version, setVersion] = useState<'original' | 'semicircle' | 'constellation'>('original')
  const [ringSpeeds, setRingSpeeds] = useState<[number, number, number]>([20, 34, 48])

  const combinedSource =
    version === 'semicircle'
      ? `// rotating-speakers-semicircle.tsx\n${rotatingSpeakersSemicircleSource}\n\n// speakers.ts (data)\n${speakersDataSource}`
      : version === 'constellation'
        ? `// living-constellation.tsx\n${livingConstellationSource}\n\n// speakers.ts (data)\n${speakersDataSource}`
        : `// rotating-speakers.tsx\n${rotatingSpeakersSource}\n\n// rotating-speakers-mobile.tsx\n${rotatingSpeakersMobileSource}\n\n// speakers.ts (data)\n${speakersDataSource}`

  return (
    <div className="space-y-6">
      <header>
        <Button
          variant="ghost"
          size="sm"
          className="mb-3 -ml-2 text-text-secondary hover:text-text-primary gap-2 text-base"
          onClick={() => navigate('/experiments')}
        >
          <ArrowLeft size={16} strokeWidth={1.5} />
          Back
        </Button>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-extrabold text-text-primary tracking-tight">
            Rotating Speakers
          </h1>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-base"
            onClick={() => setExportOpen(true)}
          >
            <Code size={16} strokeWidth={1.5} />
            Export
          </Button>
        </div>
        <p className="mt-3 text-text-secondary text-base font-light leading-relaxed max-w-2xl">
          Speaker portraits orbiting in concentric elliptical rings. Hover to
          pause, click a speaker to reveal their details in the center.
        </p>
      </header>

      <div className="flex items-start gap-4 lg:gap-8 flex-wrap">
        <div className="flex items-center gap-2">
          <Label className="text-base text-text-secondary font-light shrink-0">
            Version
          </Label>
          <div className="flex rounded-md border border-border-default overflow-hidden">
            <button
              className={`px-3 py-1.5 text-[14px] transition-colors ${
                version === 'original'
                  ? 'bg-text-primary text-white'
                  : 'text-text-secondary hover:bg-surface-raised'
              }`}
              onClick={() => setVersion('original')}
            >
              Original
            </button>
            <button
              className={`px-3 py-1.5 text-[14px] transition-colors ${
                version === 'semicircle'
                  ? 'bg-text-primary text-white'
                  : 'text-text-secondary hover:bg-surface-raised'
              }`}
              onClick={() => setVersion('semicircle')}
            >
              Semi-circle
            </button>
            <button
              className={`px-3 py-1.5 text-[14px] transition-colors ${
                version === 'constellation'
                  ? 'bg-text-primary text-white'
                  : 'text-text-secondary hover:bg-surface-raised'
              }`}
              onClick={() => setVersion('constellation')}
            >
              Constellation
            </button>
          </div>
        </div>

        {!isMobile && version === 'semicircle' && (
            <div className="flex items-center gap-4">
              <Label className="text-base text-text-secondary font-light shrink-0">
                For Didier
              </Label>
              {RING_LABELS.map((label, i) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="text-[14px] text-text-tertiary shrink-0">{label}</span>
                  <Slider
                    className="w-28"
                    value={[ringSpeeds[i]]}
                    onValueChange={([v]) => {
                      setRingSpeeds((prev) => {
                        const next = [...prev] as [number, number, number]
                        next[i] = v
                        return next
                      })
                    }}
                    min={5}
                    max={120}
                    step={1}
                  />
                  <span className="text-[14px] text-text-tertiary font-mono w-10 text-right shrink-0">
                    {ringSpeeds[i]}s
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>

      {isMobile ? (
        version === 'constellation' ? (
          <div
            className="relative -mx-16 overflow-hidden"
            style={{
              background: 'var(--BG-Main, linear-gradient(0deg, #E5EBFF 19.98%, #FBFAFC 100%))',
              height: 'min(150vw, calc(100vh - 220px))',
              minHeight: 640,
            }}
          >
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#FBFAFC] to-transparent z-10 pointer-events-none" />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#E8EDFF] to-transparent z-10 pointer-events-none" />
            <img
              src="/speakers/bg/DC8-Moon-BG-Element.svg"
              alt=""
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{ height: '88%', objectFit: 'contain' }}
            />
            <LivingConstellation speakers={speakers} />
          </div>
        ) : (
          <div
            className="relative -mx-16 overflow-x-clip"
            style={{ background: 'var(--BG-Main, linear-gradient(0deg, #E5EBFF 19.98%, #FBFAFC 100%))' }}
          >
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#FBFAFC] to-transparent z-10 pointer-events-none" />
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#E8EDFF] to-transparent z-10 pointer-events-none" />
            <img
              src="/speakers/bg/DC8-Moon-BG-Element.svg"
              alt=""
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{ height: '50vh', objectFit: 'contain' }}
            />
            <RotatingSpeakersMobile speakers={speakers} />
          </div>
        )
      ) : (
        <div
          className="relative w-full rounded-xl border border-border overflow-hidden"
          style={{
            height: version === 'semicircle' ? 'calc(46vh + 64px)' : 'calc(70vh + 128px)',
            minHeight: version === 'semicircle' ? 520 : 828,
            background: 'var(--BG-Main, linear-gradient(0deg, #E5EBFF 19.98%, #FBFAFC 100%))',
          }}
        >
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#FBFAFC] to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#E8EDFF] to-transparent z-10 pointer-events-none" />
          <img
            src="/speakers/bg/DC8-Moon-BG-Element.svg"
            alt=""
            className={`absolute pointer-events-none ${
              version === 'semicircle'
                ? 'left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2'
                : 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2'
            }`}
            style={{
              width: version === 'semicircle' ? '70%' : undefined,
              height: version === 'semicircle' ? undefined : '92%',
              objectFit: 'contain',
            }}
          />
          {version === 'original' ? (
            <RotatingSpeakers speakers={speakers} />
          ) : version === 'semicircle' ? (
            <RotatingSpeakersSemicircle speakers={speakers} ringSpeeds={ringSpeeds} />
          ) : (
            <LivingConstellation speakers={speakers} />
          )}
        </div>
      )}

      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        componentSource={combinedSource}
        installCommand="npm install motion"
        fileName="rotating-speakers.tsx"
      />
    </div>
  )
}
