import { Trophy, ThumbsUp, Minus, AlertCircle } from 'lucide-react'

const rankConfig = {
  Outstanding: { class: 'badge-outstanding', icon: Trophy },
  Good: { class: 'badge-good', icon: ThumbsUp },
  Partial: { class: 'badge-partial', icon: Minus },
  Poor: { class: 'badge-poor', icon: AlertCircle },
}

export default function Badge({ rank }) {
  const config = rankConfig[rank] || rankConfig.Poor
  const Icon = config.icon
  return (
    <span className={config.class}>
      <Icon size={11} />
      {rank}
    </span>
  )
}
