import { Type } from "@angular/core";
import { DraftBattleComponent } from "./draft-battle/draft-battle.component";
import { GuessChampionComponent } from "./guess-champion/guess-champion.component";
import { FusionChampionsComponent } from "./fusion-champions/fusion-champions.component";
import { TurretTankComponent } from "./turret-tank/turret-tank.component";
import { TiktokRankingComponent } from "./tiktok-ranking/tiktok-ranking.component";
import { UndercoverChampionComponent } from "./undercover-champion/undercover-champion.component";
import { BrumeComponent } from "./brume/brume.component";
import { LoldleComponent } from "./loldle/loldle.component";
import { IntrusComponent } from "./intrus/intrus.component";
import { VotePartyComponent } from "./vote-party/vote-party.component";
import { CroquisComponent } from "./croquis/croquis.component";

export const MINI_GAME_COMPONENTS: Record<string, Type<unknown>> = {
	"draft-battle": DraftBattleComponent,
	"guess-champion": GuessChampionComponent,
	"fusion-champions": FusionChampionsComponent,
	"turret-tank": TurretTankComponent,
	"tiktok-ranking": TiktokRankingComponent,
	"undercover-champion": UndercoverChampionComponent,
	"brume": BrumeComponent,
	"loldle": LoldleComponent,
	"intrus": IntrusComponent,
	"vote-party": VotePartyComponent,
	"croquis": CroquisComponent,
};
