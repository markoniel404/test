/*
 var jq = document.createElement('script');
 jq.src = "//ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js";
 document.getElementsByTagName('head')[0].appendChild(jq);
 // ... give time for script to load, then type.
 setTimeout(function() {
 jQuery.noConflict();
 console.log("No Conflict");
 }, 1000);
 */

/*
 * Automated Player
 *      roundsToPlay
 *      shuffleSeed
 *      requestDelay
 * Betting
 *      baseBet
 *      maxBet
 *      Strategy
 *          Oscar
 *              bustLimit
 *              surrenderLimit
 *              playUntilEndOfSeries
 *          Martingale
 *              safetyFactor
 *              playUntilEndOfSeries
 * Basic Strategy
 *      Hard,Soft,Double
 *
 *
 * https://api.coinroyale.com/api/blackjack?access_token=b26741c3-96ac-4442-98a7-6b7aee1bd8e4&currency=btc
 * https://api.coinroyale.com/api/blackjack/game?access_token=b26741c3-96ac-4442-98a7-6b7aee1bd8e4&currency=btc
 * https://api.coinroyale.com/api/blackjack/game?access_token=b26741c3-96ac-4442-98a7-6b7aee1bd8e4&currency=btc
 */

var cr = {
    roundsToPlay: 100,
    requestDelay: 1000,
    btcConverter: 100000000,
    betting: {
        currBet: 0.000001,
        win: function() { },
        lose: function() { }
    },
    oscarGrind: {
        baseBet:    0.000001,
        currBet:    0.000001, // = baseBet
        bustLimit: -0.000030, // = 30 * baseBet
        maxBet:     0.000010, // = 10 * baseBet
        winnings: 0,
        win: function() {
            cr.betting.winnings += cr.betting.currBet;
            if (winnings >= cr.betting.baseBet) {
                console.log("Congrats, you won the series!!! :)");
                cr.betting.reset();
            } else {
                cr.betting.currBet *= 2;
                if (cr.betting.currBet >= cr.betting.maxBet) {
                    console.error("Shit... You are over the maximum bet... Hopefully you can figure something out... Good luck!");
                }
            }
        },
        lose: function() {
            cr.betting.winnings -= cr.betting.currBet;
            if (cr.betting.winnings <= cr.betting.bustLimit) {
                console.error("Shit... You busted... :(");
                cr.betting.reset();
            }
        },
        reset: function() {
            cr.betting.currBet = cr.betting.baseBet;
            cr.betting.winnings = 0;
        }
    },
    martingale: {
        baseBet: 0.000001,
        currBet: 0.000001,
        maxBet: 0.25,
        lossMultiplier: 1,
        win: function() {
            cr.betting.reset(cr.betting.baseBet);
        },
        lose: function() {
            var b = cr.betting;
            b.currBet *= b.lossMultiplier;
            if (b.currBet > b.maxBet) {
                b.reset(b.baseBet);
            }
        },
        reset: function(newBaseBet) {
            var b = cr.betting;
            b.currBet = newBaseBet > 0 ? newBaseBet : b.baseBet;
        }
    },
    betUrl: "//api.coinroyale.com/api/blackjack?access_token=<<ac>>&currency=btc",
    actionUrl: "//api.coinroyale.com/api/blackjack/game?access_token=<<ac>>&currency=btc",
    req: function(data, success, url) {
        var accessToken = cr.getCookie('accessToken');
        setTimeout(function() {
            jQuery.ajax({
                url: url.replace(/<<ac>>/g, accessToken),
                type: "POST",
                headers: {
                    'Accept': "application/json, text/plain, */*",
                    'Content-Type': 'application/json;charset=UTF-8',
                },
                data: data,
                dataType: "json",
                success: success
            });
        }, cr.requestDelay);
    },
    logGameState: function(actionName, game) {
        console.log({
            action: actionName,
            summary: JSON.stringify({
                player: game.player.currentScore,
                dealer: game.dealer.score,
                payout: game.payout
            }),
            game: game
        });
    },
    bet: function(amount, callback) {
        var reqData = '{"bet_amount":'+(amount*cr.btcConverter)+',"seed":"g2rumek7rv0a4i"}';
        cr.req(reqData, function(restApiData) {
            callback(cr.digest(restApiData));
        },  cr.betUrl);
    },
    getCardValue: function(card) {
        if (!card.rank) return 0;
        var rank = Number(card.rank);
        switch(rank) {
            case 11: // J
            case 12: // Q
            case 13: // K
                rank = 10;
                break;
            case 14: // A
                rank = 1;
        }
        return rank;
    },
    a: function action(name, callback) {
        var data = '{"move":"'+name+'"}';
        cr.req(data, function(restApiData) {
            var table = cr.digest(restApiData);
            cr.logGameState(name, table);
            callback(table);
        }, cr.actionUrl);
    },
    hit: function(cb) {cr.a("hit", cb)},
    stand: function(cb) {cr.a("stay", cb)},
    split: function(cb) {cr.a("split", cb)},
    double: function(cb) {cr.a("doubledown", cb)},
    play: function(table, resultsCallback) {
        function executeAction(table) {
            if (table.result >= 0) {
                resultsCallback(table);
            } else {
                var action = cr.bs.getAction(table);
                if (action == 's') {
                    cr.stand(executeAction);
                } else if (action == 'h') {
                    cr.hit(executeAction);
                } else if (action == 'd') {
                    cr.double(executeAction);
                } else if (action == 'p') {
                    cr.split(executeAction);
                } else {
                    console.error("Unknown action (" + action + ").");
                }
            }
        }
        executeAction(table);
    },
    playRound: function(resultsCallback, finishedCallback) {
        cr.bet(cr.betting.currBet, function(table) {
            cr.logGameState("Starting new hand", table);
            cr.play(table, function(table) {
                // TODO: handle the edge cases of eval e.g. splitting and doubling.
                if (table.result == 0) {
                    cr.betting.lose();
                    if (resultsCallback) {
                        resultsCallback.lose(table);
                    }
                    console.log("lose... :(");
                } else if (table.result > cr.betting.currBet) {
                    cr.betting.win();
                    if (resultsCallback) {
                        resultsCallback.win(table);
                    }
                    console.log("WIN!!!");
                } else {
                    if (resultsCallback) {
                        resultsCallback.push(table);
                    }
                    console.log("Push. Meh.");
                }
                if (cr.roundsToPlay-- > 0) {
                    console.log("Games Remaining: " + cr.roundsToPlay);
                    cr.playRound();
                } else {
                    console.log("Done");
                    finishedCallback();
                }
            });
        });
    },
    playRounds: function(count, resultsCallback, finishedCallback){
        cr.roundsToPlay = count;
        function countRounds() {
            if (cr.roundsToPlay-- > 0) {
                cr.playRound(resultsCallback, finishedCallback);
            }
        }
        countRounds();
    },
    digest: function(data) {
        var game = data.game;
        var currentHand = typeof game.player_split == 'undefined' ? game.player : game.player_split;
        return {
            player: {
                balance: data.balances.btc / 100000000,
                bet: cr.betting.currBet,
                currentScore: cr.getScore(currentHand),
                scores: cr.getScores(cr.getHands(game)),
                isSoft: cr.isSoft(currentHand),
                isDouble: cr.isDouble(currentHand),
                hands: cr.getHands(game)
            },
            dealer: {
                score: cr.getScore(game.dealer),
                cards: game.dealer
            },
            result: typeof game.total_payout != 'undefined' ? game.total_payout / 100000000 : -1
        };
    },
    getHands: function(game) {
        var hands = [ game.player ];
        if (game.player_split) {
            hands.push(game.player_split);
        }
        return hands;
    },
    getScores: function(hands) {
        var scores = [];
        for (var i=0;i<hands.length;i++) {
            scores.push(cr.getScore(hands[i]));
        }
        return scores;
    },
    getScore: function(hand) {
        var score = 0;
        var sawAce = false;
        for (var i=0;i<hand.length;i++) {
            var c = cr.getCardValue(hand[i]);
            if (c == 1) sawAce = true;
            score += c;
        }
        return sawAce && score <= 11 ? score + 10 : score;
    },
    isSoft: function(hand) {
        var score = 0;
        var sawAce = false;
        for (var i=0;i<hand.length;i++) {
            var c = cr.getCardValue(hand[i]);
            if (c == 1) sawAce = true;
            score += c;
        }
        return sawAce && score <= 10;
    },
    isDouble: function(hand) {
        return hand.length == 2 && cr.getCardValue(hand[0]) == cr.getCardValue(hand[1]);
    },
    bs: {
        getAction: function(table) {
            var p = table.player.currentScore;
            var d = table.dealer.score;
            var arr = table.player.isDouble ? this.doubleHands
                : table.player.isSoft ? this.softHands : this.hardHands;
            var action = arr[p-4][d-2];
            if (action == 'd' && !table.player.hands.length == 2) {
                action = 'h';
            }
            return action;
        },
        hardHands: [
            //2    3    4    5    6    7    8    9   10   11
            ['h', 'h', 'h', 'h', 'h', 'h', 'h', 'h', 'h', 'h'], // player 4
            ['h', 'h', 'h', 'h', 'h', 'h', 'h', 'h', 'h', 'h'], // player 5
            ['h', 'h', 'h', 'h', 'h', 'h', 'h', 'h', 'h', 'h'], // player 6
            ['h', 'h', 'h', 'h', 'h', 'h', 'h', 'h', 'h', 'h'], // player 7
            ['h', 'h', 'h', 'h', 'h', 'h', 'h', 'h', 'h', 'h'], // player 8
            ['h', 'd', 'd', 'd', 'd', 'h', 'h', 'h', 'h', 'h'], // player 9
            ['d', 'd', 'd', 'd', 'd', 'd', 'd', 'd', 'h', 'h'], // player 10
            ['d', 'd', 'd', 'd', 'd', 'd', 'd', 'd', 'd', 'h'], // player 11
            ['h', 'h', 's', 's', 's', 'h', 'h', 'h', 'h', 'h'], // player 12
            ['s', 's', 's', 's', 's', 'h', 'h', 'h', 'h', 'h'], // player 13
            ['s', 's', 's', 's', 's', 'h', 'h', 'h', 'h', 'h'], // player 14
            ['s', 's', 's', 's', 's', 'h', 'h', 'h', 'h', 'h'], // player 15
            ['s', 's', 's', 's', 's', 'h', 'h', 'h', 'h', 'h'], // player 16
            ['s', 's', 's', 's', 's', 's', 's', 's', 's', 's'], // player 17
            ['s', 's', 's', 's', 's', 's', 's', 's', 's', 's'], // player 18
            ['s', 's', 's', 's', 's', 's', 's', 's', 's', 's'], // player 19
            ['s', 's', 's', 's', 's', 's', 's', 's', 's', 's'], // player 20
            ['s', 's', 's', 's', 's', 's', 's', 's', 's', 's']  // player 21
        ],
        softHands: [
            //2    3    4    5    6    7    8    9   10   11
            [],[],[],[],[],[],[],[],[],
            ['h', 'h', 'h', 'd', 'd', 'h', 'h', 'h', 'h', 'h'], // player 13
            ['h', 'h', 'h', 'd', 'd', 'h', 'h', 'h', 'h', 'h'], // player 14
            ['h', 'h', 'd', 'd', 'd', 'h', 'h', 'h', 'h', 'h'], // player 15
            ['h', 'h', 'd', 'd', 'd', 'h', 'h', 'h', 'h', 'h'], // player 16
            ['h', 'd', 'd', 'd', 'd', 'h', 'h', 'h', 'h', 'h'], // player 17
            ['s', 'd', 'd', 'd', 'd', 's', 's', 'h', 'h', 'h'], // player 18
            ['s', 's', 's', 's', 's', 's', 's', 's', 's', 's'], // player 19
            ['s', 's', 's', 's', 's', 's', 's', 's', 's', 's'], // player 20
            ['s', 's', 's', 's', 's', 's', 's', 's', 's', 's']  // player 21
        ],
        doubleHands: [
            //   2    3    4    5    6    7    8    9   10   11
            ['p', 'p', 'p', 'p', 'p', 'p', 'h', 'h', 'h', 'h'], // player 2,2
            [],['p', 'p', 'p', 'p', 'p', 'p', 'h', 'h', 'h', 'h'], // player 3,3
            [],['h', 'h', 'h', 'p', 'p', 'h', 'h', 'h', 'h', 'h'], // player 4,4
            [],['d', 'd', 'd', 'd', 'd', 'd', 'd', 'd', 'h', 'h'], // player 5,5
            [],['p', 'p', 'p', 'p', 'p', 'h', 'h', 'h', 'h', 'h'], // player 6,6
            ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'], // player 11,11
            ['p', 'p', 'p', 'p', 'p', 'p', 'h', 'h', 'h', 'h'], // player 7,7
            [],['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'], // player 8,8
            [],['p', 'p', 'p', 'p', 'p', 's', 'p', 'p', 's', 's'], // player 9,9
            [],['s', 's', 's', 's', 's', 's', 's', 's', 's', 's']  // player 10,10
        ]
    },
    getCookie: function getCookie(cname) {
        var name = cname + "=";
        var ca = document.cookie.split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == ' ') c = c.substring(1);
            if (c.indexOf(name) != -1) return c.substring(name.length, c.length);
        }
        return "";
    }
};
var testData1 = {
    "game": {
        "current_player": "player",
        "player_seed": "g2rumek7rv0a4i",
        "current_bets": {
            "player": 100
        },
        "dealer": [
            {
                "showing?": true,
                "suit": "diamonds",
                "rank": 11
            },
            {
                "showing?": false
            }
        ],
        "moves": [
            "hit",
            "stay",
            "split",
            "doubledown"
        ],
        "initial_bet": 100,
        "dealer_shuffle_digest": "46bda10ad03dade80b7147912ae4963197af12481690f1fadfb6cda48a162170",
        "status": "playing",
        "players": [
            "player"
        ],
        "player": [
            {
                "showing?": true,
                "suit": "diamonds",
                "rank": 12
            },
            {
                "showing?": true,
                "suit": "spades",
                "rank": 11
            }
        ],
        "uuid": "2cf33e6117a34a52af4d1267507c2dec"
    },
    "next_game": {
        "dealer_shuffle_digest": "cdabee5cb72f09b9976c94635f49525bd1bf7b20dc59a867344a134572041fd3"
    },
    "balances": {
        "btc": 6209500,
        "credits": 1239500
    }
};

var testData2 = {
    "game": {
        "current_player": "dealer",
        "player_shuffle": "Qd,Jd,Js,5d,Jd,9c,2c,10d,Qs,10c,5c,2h,8c,7s,Jh,9h,3d,8h,Kh,4h,3h,5h,6s,Kc,Qs,10h,Ad,8c,Qs,Kd,2c,Kd,7s,7h,Kc,7c,3s,10d,2h,5d,6h,5h,Qh,Kh,10s,8h,5d,2h,Jc,Ad,6d,Jd,4c,Jh,7d,6d,5c,2s,9s,Js,2s,10h,4c,2d,7s,10h,Jh,5h,3d,Ad,3c,Kc,3h,10h,8d,Qs,Qh,7s,2c,As,5s,5c,10c,6s,8s,2s,9d,4h,Jh,2c,4s,8h,Ac,2d,10s,5s,4d,9c,4h,3s,Ah,3s,9c,9h,Qs,Kd,8s,4d,9d,8h,5h,2h,7c,2h,Ah,9c,Ks,9c,3h,Ks,3d,Ks,9h,Jc,As,3h,2d,Ah,8s,Jd,9s,Ac,Ah,As,4d,8h,6c,6h,9d,4h,Ks,Qd,5c,9h,5s,8h,Ks,10c,8d,Qc,Js,6h,5s,Ad,7c,2s,9c,10d,Ks,2s,6h,6c,10h,10d,Qc,3c,Jh,6h,8c,Ah,Kh,3s,6s,3s,7d,2s,9s,4d,Qh,8s,Qh,7h,10d,2s,10s,8s,Js,3c,9h,2h,Kd,5s,Js,8s,10h,5c,8d,7d,Jc,6d,Kd,Ah,7c,Kd,4h,6c,2c,Ad,8h,4h,9c,5d,8d,5d,10s,Kc,5d,4s,2c,8s,Qh,Qc,5h,Ad,2s,Ah,As,8h,7s,10d,9d,2d,7s,Qh,6s,2d,Jc,8s,4s,4d,4h,9s,Kc,9s,10d,5d,10h,7h,3s,9c,9d,6c,Js,9h,Js,Js,Jh,7s,3c,Qc,6c,3h,Qh,4c,8d,Qd,8d,Qd,As,Qs,10s,4h,10s,10s,Qc,3h,10s,2c,Qs,2h,Ac,7h,Kh,6d,Jc,7c,7c,Ks,Qd,Qc,7h,6s,3h,8c,6c,9s,6d,9h,Jh,Ad,2h,3d,7d,Kh,Kc,Ac,Kc,Kd,10d,Jh,5s,4s,6s,3h,8c,4d,4d,Qc,Kc,3s,5h,4s,5s,9s,Ac,7c,2d,7d,Jc,3c,5h,4c,Ac,Ac,Ks,Qd,9d,Kh,Jd,4c,6d,3c,Kh,Kh,4c,3c,Qs,7c,9d,10c,6d,6h,7d,Jd,3c,Kd,6s,7h,2d,8d,2d,4c,4d,6s,4c,4s,5c,Ac,3s,5h,7s,8d,6c,8c,6h,10c,5c,7h,Qd,7h,As,Ah,Jd,8c,10c,10h,Qc,6h,9h,9d,6c,3d,Jc,5c,6d,3d,10c,10c,2c,As,3d,8c,Jd,7d,7d,As,3d,5s,5d,Jc,9s,Qh,4s,Qd,Ad,4s",
        "dealer_seed": "ncxlTQsk0YdBdC6ZzlGl4w==",
        "player_seed": "g2rumek7rv0a4i",
        "current_bets": {
            "player": 100
        },
        "total_payout": 200,
        "dealer": [
            {
                "showing?": true,
                "suit": "diamonds",
                "rank": 11
            },
            {
                "showing?": true,
                "suit": "diamonds",
                "rank": 5
            },
            {
                "showing?": true,
                "suit": "diamonds",
                "rank": 11
            }
        ],
        "moves": [],
        "initial_bet": 100,
        "dealer_shuffle_digest": "46bda10ad03dade80b7147912ae4963197af12481690f1fadfb6cda48a162170",
        "dealer_shuffle": "8c,8h,Ac,3c,2h,9d,8d,10h,10h,4h,9c,Kd,7d,Qc,As,8h,8h,6c,9s,4h,10d,9h,5c,10c,Ah,5h,4d,3h,9s,5d,Qs,8s,8s,2d,Ac,4d,Ks,5s,6s,2d,4s,8h,5s,Ac,8d,Qh,2s,7s,7c,As,Ks,Qc,4s,7h,Jd,3c,Js,Ad,5d,Qd,5h,Kc,6s,8c,7c,Qc,7d,8c,Jd,3d,3s,Ks,2c,5s,4h,5h,9d,8s,8s,5d,6c,10d,2d,8d,3h,10d,6h,10c,Kd,7h,Jh,5c,Jd,5c,6h,8s,Qd,5c,7h,Ah,5s,8h,Kh,6c,2s,8d,Jh,4c,4c,2c,7d,Ad,3d,7c,Jd,Kc,Jc,5s,9c,9c,4d,5d,9h,2d,Jc,2d,10d,3c,6d,6s,9s,Kd,6s,10d,Jh,Jc,5d,Kd,9s,Js,7d,7c,4c,2s,3d,6s,10h,9c,2c,8h,Ac,6h,Jd,2h,Kd,Qs,10d,3h,3c,8d,7c,4d,Ad,9s,Ks,Jh,Qc,2d,9s,8s,Ah,7h,9h,9c,6h,As,3d,2s,Qh,Jh,Ac,10h,6d,10h,4d,Qs,Qs,5c,7c,5h,Jh,5d,7d,2c,As,9c,5h,2h,9d,Kh,10c,3s,9d,3s,3s,Kh,4h,4h,6d,2h,6d,Jc,Kd,9d,10s,7s,4d,3d,6s,8s,7h,Ad,10h,9h,Ad,3h,5c,Kc,10h,6d,9h,Jd,8s,10c,Ac,3d,Ks,5d,6h,10s,Kh,9c,4s,Qh,3c,4s,2s,3s,2h,4h,2s,Jc,10s,Qc,Js,9s,7c,3s,7d,Qd,6d,6d,Jc,4s,Ah,Jc,9d,2c,7s,6h,7s,4d,7s,3c,8c,Jc,3h,2s,10s,Qs,8c,Kc,2d,9d,4d,7c,Ad,7d,As,Qh,3c,As,Ks,7h,5h,5h,10c,8c,5h,8c,Ah,7s,6s,Js,4c,3d,Ad,6c,10s,8d,Js,9d,4s,6c,4s,5s,Js,Qd,Qh,Qd,Kd,9c,4c,Jd,10s,Qd,7h,Kc,6c,4s,5d,Ah,2s,3h,Js,5c,Qd,Qc,8h,2c,Qs,As,Ks,4c,Kh,3s,8h,Qs,9h,8d,Ac,Kc,Ad,5s,Kc,7s,Qs,3s,7d,Ah,Jh,6c,Qc,10d,Ah,8c,4h,4c,Qc,Kh,2c,8d,4c,Ks,3c,10h,Qh,2d,6h,6s,5c,3h,10s,2h,Kd,Qh,6h,As,2h,10c,10s,Qd,9s,Jd,10d,6d,9h,7h,2c,Ac,2h,Kh,3h,6c,9h,10c,7s,4h,5s,Qh,3d,Js,Jh,Kh,10c,Kc",
        "status": "game-over",
        "players": [
            "player"
        ],
        "player": [
            {
                "showing?": true,
                "suit": "diamonds",
                "rank": 12
            },
            {
                "showing?": true,
                "suit": "spades",
                "rank": 11
            }
        ],
        "uuid": "2cf33e6117a34a52af4d1267507c2dec",
        "payouts": {
            "player": 200
        },
        "total_bet": 100,
        "outcomes": {
            "player": "win"
        }
    },
    "next_game": {
        "dealer_shuffle_digest": "cdabee5cb72f09b9976c94635f49525bd1bf7b20dc59a867344a134572041fd3"
    },
    "balances": {
        "btc": 6209700,
        "credits": 1239500
    }
};

var testSplit1 = {
    "game": {
        "current_player": "player-split",
        "player_seed": "fuqnvqekl2surf6r",
        "current_bets": {
            "player_split": 100,
            "player": 100
        },
        "dealer": [
            {
                "showing?": true,
                "suit": "hearts",
                "rank": 13
            },
            {
                "showing?": false
            }
        ],
        "moves": [
            "hit",
            "stay",
            "doubledown"
        ],
        "initial_bet": 100,
        "dealer_shuffle_digest": "f119fbc10778fc4b3edc1a0c3e8816a804a22264022ae54935c60c1413eeb19c",
        "player_split": [
            {
                "showing?": true,
                "suit": "diamonds",
                "rank": 10
            },
            {
                "showing?": true,
                "suit": "diamonds",
                "rank": 10
            }
        ],
        "special_options": {
            "player_split": [
                "split"
            ],
            "player": [
                "split"
            ]
        },
        "status": "playing",
        "players": [
            "player",
            "player-split"
        ],
        "player": [
            {
                "showing?": true,
                "suit": "hearts",
                "rank": 12
            },
            {
                "showing?": true,
                "suit": "clubs",
                "rank": 1
            }
        ],
        "uuid": "611bb87aa385478894ca15031b471565"
    },
    "next_game": {
        "dealer_shuffle_digest": "0f0b17c7d0b550a4318f62313a2e5aa27e42800a399969f129e982ed23cd4297"
    },
    "balances": {
        "btc": 6208500,
        "credits": 1239500
    }
};