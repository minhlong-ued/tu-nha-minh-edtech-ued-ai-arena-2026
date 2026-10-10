import React, {useState} from 'react';
type Props = {task: number; lookImage?: string; lookName: string; completed: boolean; onComplete: () => void; onClose: () => void};
export function YearbookTasks({task,lookImage,lookName,completed,onComplete,onClose}: Props) {
  const [points,setPoints] = useState<number[]>([]);
  const [selection,setSelection] = useState<number|null>(null);
  const [done,setDone] = useState(completed);
  const finish = () => {setDone(true); onComplete();};
  // This is a fictional illustration, not an authenticated garment pattern.
  const buttons = [[49,22],[59,29],[67,39],[69,54],[69,69]];
  return <div role="dialog" aria-modal="true" aria-labelledby="yearbook-title" className="fixed inset-0 z-50 bg-[#3a2719]/60 flex items-center justify-center p-4">
    <section className="w-full max-w-lg max-h-[90dvh] overflow-y-auto rounded-2xl bg-[#fdfbf6] border-2 border-[#d9c4af] p-5 space-y-4 shadow-xl">
      <div className="flex justify-between items-start gap-3"><h2 id="yearbook-title" className="text-lg font-semibold">{task === 1 ? 'Lớp trưởng · Chuẩn bị lên hình' : 'Thợ ảnh · Góc nhìn ống tay'}</h2><button onClick={onClose} aria-label="Đóng nhiệm vụ" className="p-2 rounded-lg border">✕</button></div>
      <p className="text-sm">{task === 1 ? 'Trước khi chụp, mình cùng quan sát các điểm trên bản minh họa. Chạm lần lượt từ 1 đến 5 để chuẩn bị trang phục của nhân vật trong câu chuyện.' : 'Mình chụp vài chi tiết làm trang nhật ký nhé. Quan sát mẫu bên trái rồi chọn hình có cùng đường viền ống tay.'}</p>
      <p className="text-xs text-[#8c6d54] bg-[#f3eadc] rounded-lg p-3">Thao tác minh họa trên bản vẽ hư cấu. Cấu trúc trang phục đang chờ đối chiếu nguồn; đây không phải hướng dẫn may, mặc hoặc bài kiểm tra kiến thức văn hóa.</p>
      {task === 1 ? <>
        <div className="relative h-64 rounded-xl bg-[#edf4ee] border overflow-hidden mx-auto max-w-xs">
          <svg preserveAspectRatio="none" viewBox="0 0 100 100" className="absolute w-full h-full" aria-hidden="true"><path d="M35 15 L45 10 L55 10 L65 15 L83 30 L76 42 L70 35 L75 90 L25 90 L30 35 L24 42 L17 30 Z" fill="#527c83" stroke="#304f55" strokeWidth="1.5"/><path d="M49 22 L59 29 L67 39 L69 54 L69 69" fill="none" stroke="#f1debe" strokeWidth="1" strokeDasharray="2 2"/></svg>
          {buttons.map(([x,y],i)=><button key={i} aria-label={`Điểm ${i+1}`} disabled={done} onClick={()=>{if(i !== points.length)return;const next=[...points,i];setPoints(next);if(next.length===5)finish();}} style={{left:`${x}%`,top:`${y}%`}} className={`absolute -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full border-2 font-bold ${points.includes(i)||done?'bg-[#3d8b7a] text-white':'bg-[#fff4d7] text-[#543825]'}`}>{i+1}</button>)}
        </div><p className="text-sm text-center">{done ? '5/5 điểm đã hoàn thành' : `Tiếp theo: điểm ${points.length+1}`}</p>
      </> : <div className="space-y-3">
        <svg viewBox="0 0 220 90" className="w-full h-32 rounded-xl bg-[#edf4ee]" role="img" aria-label="Mẫu ống tay hình chữ nhật thu hẹp nhẹ về cổ tay"><path d="M20 25 L180 33 L180 57 L20 65 Z" fill="#527c83" stroke="#304f55" strokeWidth="3"/><path d="M175 33 L175 57" stroke="#f1debe" strokeWidth="3"/></svg>
        <div className="grid grid-cols-2 gap-3">{[0,1].map(i=><button key={i} disabled={done} aria-label={`Ống tay ${i===0?'A':'B'}`} onClick={()=>setSelection(i)} className={`p-3 border-2 rounded-xl ${selection===i?'border-[#3d8b7a] bg-[#e8f3ed]':'border-[#d9c4af]'}`}><svg viewBox="0 0 100 70" className="w-full h-20" aria-hidden="true"><path d={i===1?'M10 20 L85 25 L85 45 L10 50 Z':'M10 20 L85 8 L85 62 L10 50 Z'} fill="#527c83" stroke="#304f55" strokeWidth="2"/></svg>Hình {i===0?'A':'B'}</button>)}</div>
        <button disabled={selection===null||done} onClick={()=>{if(selection===1)finish();}} className="w-full rounded-xl bg-[#3d8b7a] text-white p-3 disabled:opacity-50">So với mẫu</button>
        {selection===0&&!done&&<p className="text-sm">Hình A mở rộng ở đầu ống. Thử đối chiếu đường viền với mẫu một lần nữa nhé.</p>}
      </div>}
      {done && <div role="status" className="bg-[#e8f3ed] rounded-xl p-3 text-[#2d7a6b]">Đã hoàn thành hoạt động. Tiến trình được giữ lại khi bạn đổi đồ.</div>}
      <div className="flex items-center gap-3 bg-[#f3eadc] p-3 rounded-xl">{lookImage&&<img src={lookImage} alt={lookName} className="h-20 pixel-art"/>}<p className="text-xs">Bộ đồ lên hình: <strong>{lookName}</strong>. Mình giữ nguyên lựa chọn của bạn.</p></div>
      <button onClick={onClose} className="w-full border rounded-xl p-3">Quay lại sân trường</button>
    </section>
  </div>;
}
