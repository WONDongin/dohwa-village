import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'

const columns = 21
const rows = 12
const firstWalkableRow = 4

export const buildings = [
  {
    id: 'home-cooking',
    name: '집밥PICK',
    description: '10~20분 안에 만들 수 있는 집밥 메뉴와 레시피를 찾아보세요.',
    action: '집밥PICK 열기',
    icon: '🍚',
    x: 3,
  },
  {
    id: 'post-office',
    name: '기분 우체국',
    description: '행복한 순간을 나누고, 속상했던 마음은 가볍게 털어놓으세요.',
    action: '접속하기',
    path: '/post-office',
    icon: '✉️',
    x: 10,
  },
  {
    id: 'stone',
    name: '돌멩이 키우기',
    description: '작은 돌멩이를 쓰다듬고 꾸미며 천천히 키워보세요.',
    action: '접속하기',
    path: '/stone',
    icon: '🪨',
    x: 17,
  },
]

const directions = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
}

function entranceAt({ x, y }) {
  if (y > firstWalkableRow + 1) return undefined
  return buildings.find((building) => Math.abs(building.x - x) <= 1)
}

function mapPosition(x, y) {
  return { left: `${(x + 0.5) / columns * 100}%`, top: `${(y + 0.5) / rows * 100}%` }
}

function getCookingUrl() {
  const url = URL.canParse(import.meta.env.VITE_JIPBAP_PICK_URL ?? '')
    ? new URL(import.meta.env.VITE_JIPBAP_PICK_URL)
    : null
  return url && ['https:', 'http:'].includes(url.protocol) ? url.href : null
}

function Modal({ title, descriptionId, className, onClose, children }) {
  const dialog = useRef(null)

  useLayoutEffect(() => {
    const element = dialog.current
    element.showModal()
    return () => element.close()
  }, [])

  return (
    <dialog
      ref={dialog}
      aria-label={title}
      aria-describedby={descriptionId}
      className={className}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
    >
      {children}
    </dialog>
  )
}

function BuildingIntro({ building, onEnter, onClose }) {
  return (
    <Modal title={building.name} descriptionId="building-description" onClose={onClose}>
      <h2>{building.name}</h2>
      <p id="building-description">{building.description}</p>
      <div className="modal-actions">
        <button onClick={onEnter}>{building.action}</button>
        <button className="secondary" onClick={onClose}>닫기</button>
      </div>
    </Modal>
  )
}

function CookingModal({ onClose }) {
  const url = getCookingUrl()

  return (
    <Modal title="집밥PICK" className="cooking-modal" onClose={onClose}>
      <header className="cooking-header">
        <h2>집밥PICK</h2>
        <button onClick={onClose}>마을로 돌아가기</button>
      </header>
      <div className="phone">
        {url ? (
          <iframe title="집밥PICK 웹앱" src={url} />
        ) : (
          <p className="missing-url">집밥PICK 배포 주소를 설정하면 앱을 열 수 있어요.</p>
        )}
      </div>
      {url && <a href={url} target="_blank" rel="noopener noreferrer">새 탭에서 열기</a>}
    </Modal>
  )
}

export function Village({ position, setPosition, navigate }) {
  const [destination, setDestination] = useState(null)
  const [intro, setIntro] = useState(null)
  const [cookingOpen, setCookingOpen] = useState(false)
  const occupiedEntrance = useRef(entranceAt(position))
  const map = useRef(null)
  const paused = Boolean(intro || cookingOpen)

  useLayoutEffect(() => {
    const entrance = entranceAt(position)
    if (entrance === occupiedEntrance.current) return
    occupiedEntrance.current = entrance

    if (entrance) {
      setDestination(null)
      setIntro(entrance)
    }
  }, [position])

  useEffect(() => {
    if (paused) return

    function handleKeyDown(event) {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return
      if (!Object.hasOwn(directions, event.key)) return
      event.preventDefault()
      const [dx, dy] = directions[event.key]
      setDestination(null)
      setPosition(({ x, y }) => ({
        x: Math.max(0, Math.min(columns - 1, x + dx)),
        y: Math.max(firstWalkableRow, Math.min(rows - 1, y + dy)),
      }))
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [paused, setPosition])

  useEffect(() => {
    if (!destination || paused) return
    const dx = Math.sign(destination.x - position.x)
    const dy = Math.sign(destination.y - position.y)
    if (!dx && !dy) return

    const step = window.setTimeout(() => {
      // Leave the entrances before moving sideways toward a lower destination.
      const moveVertically = dy > 0 || !dx
      setPosition({
        x: position.x + (moveVertically ? 0 : dx),
        y: position.y + (moveVertically ? dy : 0),
      })
    }, 70)
    return () => window.clearTimeout(step)
  }, [destination, paused, position, setPosition])

  function walkToPoint(event) {
    if (paused) return
    const bounds = event.currentTarget.getBoundingClientRect()
    setDestination({
      x: Math.max(0, Math.min(columns - 1, Math.floor((event.clientX - bounds.left) / bounds.width * columns))),
      y: Math.max(firstWalkableRow, Math.min(rows - 1, Math.floor((event.clientY - bounds.top) / bounds.height * rows))),
    })
  }

  function closeModal() {
    setIntro(null)
    setCookingOpen(false)
    window.requestAnimationFrame(() => map.current?.focus())
  }

  function enterBuilding() {
    const { path } = intro
    setIntro(null)
    if (path) navigate(path)
    else setCookingOpen(true)
  }

  return (
    <main className="village">
      <h1>도화마을</h1>
      <p id="movement-help">방향키 또는 클릭·터치로 건물 입구까지 이동하세요.</p>
      <div ref={map} className="map" tabIndex={0} role="region"
        aria-label="도화마을 지도" aria-describedby="movement-help" onClick={walkToPoint}>
        <div className="path" aria-hidden="true" />
        {buildings.map((building) => (
          <React.Fragment key={building.id}>
            <button
              className={`building ${building.id}`}
              style={mapPosition(building.x, 1.8)}
              onClick={(event) => {
                event.stopPropagation()
                setDestination({ x: building.x, y: firstWalkableRow + 1 })
              }}
            >
              <span aria-hidden="true">{building.icon}</span>
              {building.name}
            </button>
            <div className="entrance" style={mapPosition(building.x, 4.5)} aria-hidden="true" />
          </React.Fragment>
        ))}
        <div className="character" style={mapPosition(position.x, position.y)} role="img" aria-label="내 캐릭터" />
      </div>
      {intro && <BuildingIntro building={intro} onEnter={enterBuilding} onClose={closeModal} />}
      {cookingOpen && <CookingModal onClose={closeModal} />}
    </main>
  )
}
