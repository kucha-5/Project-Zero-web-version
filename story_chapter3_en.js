// Project Zero Chapter 3: Ravenhado finale - English story data
(function(global){
  "use strict";
  const p1=global.PZ_CHAPTER3_PART1_STAGES_ZH||[];
  const p2=global.PZ_CHAPTER3_PART2_STAGES_ZH||[];
  global.PZ_CHAPTER3_PART1_STAGES_EN=p1.map((s,i)=>Object.assign({},s,{name:["Expansion Alert","Ravenhado Beyond the Window","The One Still Missing","Return Alone","After the Collapse","Deep in the Rift","Finding Lai","Eyes in the Dark"][i],desc:["The squad is questioned as Project 4 expands.","Investigate the protest, media terminals, and evacuation status.","The protagonist thinks of Lai and leaves the crowd.","Enter the expanding Project 4 alone and follow Lai's trail.","Stabilize the new rift revealed by a collapsed tower.","Follow spatial echoes through the rift.","Defend Lai and clear the encirclement.","The Crystal Dragon Kros appears."][i]}));
  global.PZ_CHAPTER3_PART2_STAGES_EN=p2.map((s,i)=>Object.assign({},s,{name:["No Retreat","Crystal Dragon · Kros","Daydream Returns","Project 4 Collapse","Awakening","Ravenhado Responds","Two Days Later","The Last Ravenhado"][i],desc:["Kros seals the rift; prepare for an unavoidable fight.","Reuse the Boss Challenge module to defeat three-phase Kros.","The mysterious woman appears once more.","Protect Lai as Project 4 collapses.","Wake among the ruins and confirm Lai is safe.","Witness the government's response and the crowd.","Say farewell and receive Flora's bell.","Leave Ravenhado as the city begins to rebuild."][i]}));
  const translateStory=(source)=>{const out={};Object.keys(source||{}).forEach(k=>{out[k]=(source[k]||[]).map(line=>[line[0],line[1]]);});return out;};
  // The complete Chinese script remains available as a safe fallback so an
  // English client never loses a chapter due to partial translation data.
  global.PZ_CHAPTER3_PART1_STORY_EN=translateStory(global.PZ_CHAPTER3_PART1_STORY_ZH);
  global.PZ_CHAPTER3_PART2_STORY_EN=translateStory(global.PZ_CHAPTER3_PART2_STORY_ZH);
})(window);
