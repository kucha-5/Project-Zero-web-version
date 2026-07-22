// Project Zero V41 Story Events
// Game actions triggered by story scripts live here.
(function(global){
  "use strict";

  global.PZ_STORY_EVENTS = {
    startTutorialBattle(){
      if(global.PZStory) global.PZStory.stop();
      if(global.PZGameBridge && typeof global.PZGameBridge.startTutorialBattle === "function"){
        global.PZGameBridge.startTutorialBattle();
      }
    },

    finishPrologueReturnLobby(){
      if(global.PZStory) global.PZStory.stop();
      if(global.PZGameBridge && typeof global.PZGameBridge.finishPrologue === "function"){
        global.PZGameBridge.finishPrologue();
      }
    }
  };
})(window);
