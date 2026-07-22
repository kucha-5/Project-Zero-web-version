// Project Zero V41 Story Scripts
// Only story data goes here. Do not put core gameplay logic in this file.
(function(global){
  "use strict";

  global.PZ_STORY_SCRIPTS = {
    tutorial_intro: [
      { speaker:{zh:"旁白", en:"Narrator"}, text:{zh:"你……来了？", en:"You... came?"}, bg:"black" },
      { speaker:{zh:"旁白", en:"Narrator"}, text:{zh:"没错。", en:"That's right."}, bg:"black" },
      { speaker:{zh:"旁白", en:"Narrator"}, text:{zh:"你的旅途，从这里开始。", en:"Your journey begins here."}, bg:"black" },
      { speaker:{zh:"旁白", en:"Narrator"}, text:{zh:"来到这里，就是为了——", en:"You came here for one reason—"}, bg:"black" },
      { speaker:{zh:"旁白", en:"Narrator"}, text:{zh:"变强。", en:"To become stronger."}, bg:"black", keyword:true },

      { speaker:{zh:"工作人员", en:"Staff"}, text:{zh:"这是你的战斗许可。欢迎来到雷文哈多。", en:"This is your combat permit. Welcome to Ravenhado."}, bg:"office" },
      { speaker:{zh:"旁白", en:"Narrator"}, text:{zh:"你接过许可。就在这时，外面突然传来巨响。", en:"You take the permit. At that moment, a heavy blast erupts outside."}, bg:"office" },
      { speaker:{zh:"居民", en:"Resident"}, text:{zh:"晶体兽！！快跑！！", en:"Crystal beasts!! Run!!"}, bg:"office" },
      { speaker:{zh:"工作人员", en:"Staff"}, text:{zh:"所有执行官立即前往现场！", en:"All executors, move to the scene immediately!"}, bg:"office" },
      { speaker:{zh:"旁白", en:"Narrator"}, text:{zh:"人群开始逃跑。守卫冲出事务处。你低头看了一眼刚拿到的许可。", en:"The crowd flees. Guards rush out of the Affairs Office. You look down at the newly issued permit."}, bg:"office" },
      { speaker:{zh:"旁白", en:"Narrator"}, text:{zh:"你没有说话，直接冲向怪物。", en:"Without a word, you run toward the monsters."}, bg:"office" },
      { event:"startTutorialBattle" }
    ],

    tutorial_after_battle: [
      { speaker:{zh:"旁白", en:"Narrator"}, text:{zh:"最后一只晶体兽倒下。街道慢慢安静下来。", en:"The last crystal beast falls. The street slowly returns to silence."}, bg:"after" },
      { speaker:{zh:"旁白", en:"Narrator"}, text:{zh:"脚步声从身后靠近。", en:"Footsteps approach from behind."}, bg:"after" },
      { speaker:{zh:"？？？", en:"???"}, text:{zh:"……是你解决的？", en:"...You handled this?"}, bg:"after" },
      { speaker:{zh:"旁白", en:"Narrator"}, text:{zh:"你沉默了。", en:"You remain silent."}, bg:"after" },
      { speaker:{zh:"旁白", en:"Narrator"}, text:{zh:"对方看了一眼你手中的战斗许可。", en:"The person glances at the combat permit in your hand."}, bg:"after" },
      { speaker:{zh:"？？？", en:"???"}, text:{zh:"刚领取许可，就敢直接冲到最前面。", en:"You just received your permit, and you still ran to the front line."}, bg:"after" },
      { speaker:{zh:"？？？", en:"???"}, text:{zh:"如果可以，我需要你跟我一起去西区。", en:"If possible, I need you to come with me to the west district."}, bg:"after" },
      { speaker:{zh:"？？？", en:"???"}, text:{zh:"那里出现了大量晶体兽。", en:"A large number of crystal beasts have appeared there."}, bg:"after" },
      { speaker:{zh:"？？？", en:"???"}, text:{zh:"现在部门的人手严重不足。", en:"The department is seriously short-handed right now."}, bg:"after" },
      {
        choice:true,
        bg:"after",
        speaker:{zh:"？？？", en:"???"},
        text:{zh:"你愿意一起去吗？", en:"Will you come with me?"},
        choices:[
          { text:{zh:"可以", en:"Accept"}, next:"tutorial_choice_accept" },
          { text:{zh:"有报酬吗？", en:"Is there a reward?"}, next:"tutorial_choice_reward" }
        ]
      }
    ],

    tutorial_choice_accept: [
      { speaker:{zh:"？？？", en:"???"}, text:{zh:"谢谢。", en:"Thank you."}, bg:"after" },
      { speaker:{zh:"？？？", en:"???"}, text:{zh:"正式行动之前，先回大厅准备一下。", en:"Before the operation, return to the lobby and prepare."}, bg:"after" },
      { event:"finishPrologueReturnLobby" }
    ],

    tutorial_choice_reward: [
      { speaker:{zh:"？？？", en:"???"}, text:{zh:"当然。事务处不会让执行官白白战斗。", en:"Of course. The Affairs Office does not let executors fight for nothing."}, bg:"after" },
      { speaker:{zh:"？？？", en:"???"}, text:{zh:"正式行动之前，先回大厅准备一下。", en:"Before the operation, return to the lobby and prepare."}, bg:"after" },
      { event:"finishPrologueReturnLobby" }
    ]
  };
})(window);
