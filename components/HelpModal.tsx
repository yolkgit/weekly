
import React from 'react';
import { X, User, Calendar, CheckCircle2, Trophy, Printer, Smile, MousePointer2, Settings, Lock } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in no-print">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden transform transition-all scale-100 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="bg-indigo-600 px-6 py-5 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-white font-bold text-xl flex items-center gap-2">
              <Smile size={24} className="text-yellow-300" />
              위클리 페이퍼 사용 설명서
            </h3>
            <p className="text-indigo-100 text-sm mt-1">아이와 함께 행복한 습관을 만들어보세요!</p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50">
          
          {/* Step 1: Child Setup */}
          <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h4 className="text-lg font-bold text-indigo-700 mb-3 flex items-center gap-2">
              <span className="bg-indigo-100 text-indigo-700 w-8 h-8 rounded-full flex items-center justify-center text-sm">1</span>
              아이 등록하기
            </h4>
            <div className="text-slate-600 space-y-2 leading-relaxed">
              <p>가장 먼저 계획표의 주인을 정해야겠죠?</p>
              <ul className="list-disc list-inside bg-slate-50 p-3 rounded-lg text-sm space-y-1">
                <li>화면 상단의 <strong className="text-slate-800">아이 이름 버튼</strong>을 눌러주세요.</li>
                <li>자녀가 여러 명이라면 <strong className="text-slate-800">설정(톱니바퀴)</strong> 버튼을 눌러 아이를 추가할 수 있어요.</li>
                <li>학년을 설정하면 그 나이에 딱 맞는 <strong className="text-indigo-600">추천 시간표</strong>를 자동으로 만들어줍니다.</li>
              </ul>
            </div>
          </section>

          {/* Step 2: Planning */}
          <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h4 className="text-lg font-bold text-indigo-700 mb-3 flex items-center gap-2">
              <span className="bg-indigo-100 text-indigo-700 w-8 h-8 rounded-full flex items-center justify-center text-sm">2</span>
              계획 세우기 (시간표 짜기)
            </h4>
            <div className="text-slate-600 space-y-2 leading-relaxed">
              <p>
                <strong className="text-rose-500">주의!</strong> 계획을 수정하려면 화면 오른쪽 위의 
                <span className="inline-block bg-slate-800 text-white text-xs px-2 py-0.5 rounded mx-1">부모님 모드</span>가 켜져 있어야 합니다.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <div className="bg-blue-50 p-3 rounded-lg">
                    <strong className="block text-blue-800 mb-1 flex items-center gap-1"><MousePointer2 size={14}/> 하나씩 선택</strong>
                    빈 칸을 한 번 <strong className="text-blue-700">클릭(터치)</strong>하면 그 시간의 할 일을 입력할 수 있어요.
                </div>
                <div className="bg-blue-50 p-3 rounded-lg">
                    <strong className="block text-blue-800 mb-1 flex items-center gap-1"><MousePointer2 size={14}/> 여러 개 선택</strong>
                    칸을 누른 상태로 <strong className="text-blue-700">쭈욱 드래그(끌기)</strong>하면 여러 시간을 한 번에 채울 수 있어요.
                </div>
              </div>
              <p className="text-sm text-slate-500 mt-2">
                * 팁: '초등/중등/고등' 버튼을 누르면 추천 시간표가 한 번에 짠! 하고 나타납니다.
              </p>
            </div>
          </section>

          {/* Step 3: Checking & Rewards */}
          <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h4 className="text-lg font-bold text-indigo-700 mb-3 flex items-center gap-2">
              <span className="bg-indigo-100 text-indigo-700 w-8 h-8 rounded-full flex items-center justify-center text-sm">3</span>
              실천 검사 & 상점 주기
            </h4>
            <div className="text-slate-600 space-y-2 leading-relaxed">
              <p>아이가 계획을 잘 지켰는지 부모님이 확인해주세요.</p>
              <ul className="list-disc list-inside bg-slate-50 p-3 rounded-lg text-sm space-y-2">
                <li>
                    먼저 <strong className="text-green-600">🔒 계획 확정하기</strong> 버튼을 눌러주세요. (계획표가 잠깁니다)
                </li>
                <li>
                    아이가 실천한 일정을 클릭하면 <strong className="text-green-600">초록색 동그라미(성공)</strong>가 표시됩니다.
                </li>
                <li>
                    지키지 못한 일정은 한 번 더 클릭하면 <strong className="text-red-500">빨간색 엑스(실패)</strong>가 됩니다.
                </li>
                <li>
                    성공할 때마다 <strong className="text-indigo-600">게임 시간(또는 포인트)</strong>이 자동으로 쌓여요!
                </li>
              </ul>
            </div>
          </section>

          {/* Step 4: Using Rewards */}
          <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h4 className="text-lg font-bold text-indigo-700 mb-3 flex items-center gap-2">
              <span className="bg-indigo-100 text-indigo-700 w-8 h-8 rounded-full flex items-center justify-center text-sm">4</span>
              보상 사용하기
            </h4>
            <div className="text-slate-600 space-y-2 leading-relaxed">
              <p>열심히 모은 점수를 아이가 쓰고 싶어 하나요?</p>
              <div className="flex items-start gap-3 mt-2 bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                <Trophy className="text-yellow-500 shrink-0 mt-1" size={24} />
                <div>
                    <p className="text-sm font-bold text-yellow-800 mb-1">왼쪽 위 점수판을 클릭하세요!</p>
                    <p className="text-sm text-yellow-700">
                        현재 모은 점수가 나옵니다. 아이가 게임을 하거나 간식을 먹으면 
                        <strong className="mx-1 bg-white px-2 py-0.5 rounded border border-yellow-200">차감</strong> 
                        버튼을 눌러 점수를 깎아주세요.
                    </p>
                </div>
              </div>
            </div>
          </section>

          {/* Advanced: Configuring Rewards */}
          <section className="bg-slate-100 p-5 rounded-xl border border-slate-200">
             <h4 className="text-lg font-bold text-slate-700 mb-3 flex items-center gap-2">
                <Settings size={20} className="text-slate-500" />
                심화: 보상 점수 내 맘대로 바꾸기
             </h4>
             <div className="text-slate-600 text-sm space-y-2">
                <p>
                    "공부할 때는 30점 주고 싶은데, 지금은 20점이네?"<br/>
                    점수를 바꾸고 싶으신가요? 이렇게 해보세요!
                </p>
                <ol className="list-decimal list-inside bg-white p-3 rounded-lg space-y-2">
                    <li>화면 오른쪽 위 <strong>부모님 모드</strong>를 켭니다.</li>
                    <li>왼쪽 위 <strong>점수판(남은 시간)</strong>을 클릭하세요.</li>
                    <li>창이 뜨면 오른쪽 위 <strong>설정(톱니바퀴) 아이콘</strong>을 누르세요.</li>
                    <li>아래쪽에 <strong>'활동별 보상 점수 설정'</strong>이 나옵니다.</li>
                    <li>공부, 학원, 학교 등 원하는 활동의 점수를 숫자로 입력하면 끝!</li>
                </ol>
             </div>
          </section>

          {/* Tips */}
          <section className="bg-slate-200 p-5 rounded-xl">
            <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-2">
                💡 소소한 꿀팁
            </h4>
            <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-center gap-2">
                    <Printer size={16} /> 
                    <span>상단의 <strong>프린터 아이콘</strong>을 누르면 종이로 인쇄해서 냉장고에 붙일 수 있어요.</span>
                </li>
                <li className="flex items-center gap-2">
                    <User size={16} /> 
                    <span><strong>부모님 모드</strong>는 아이가 함부로 점수를 조작하지 못하게 막아주는 기능입니다.</span>
                </li>
            </ul>
          </section>

        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-100 text-center">
            <button 
                onClick={onClose}
                className="w-full md:w-auto px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-transform active:scale-95"
            >
                네, 이제 시작해볼게요! 화이팅!
            </button>
        </div>
      </div>
    </div>
  );
};
