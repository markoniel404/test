/**
 * Created by david on 11/7/14.
 */

/* =========================
 *      PLAYER STATS
 =========================*/
app.PlayerStats = Backbone.Model.extend({
    defaults: {
        count: 0,
        balance: 0,
        sessionBalance: 0
    },
    recordRound: function(amount) {
        var count = this.get('count') + 1;
        this.set('count', count);
        this.set('balance', this.get('balance') + amount);
        this.set('sessionBalance', this.get('sessionBalance') + amount);
        if (amount > 0) {
            app.m.player.win.myUpdate(amount);
        } else if (amount < 0) {
            app.m.player.loss.myUpdate(amount);
        }
        app.m.player.win.updatePercentage(count);
        app.m.player.loss.updatePercentage(count);
    }
});

app.PlayerStatsView = Backbone.View.extend({
    el: '#player-stats-container',
    initialize: function () {
        this.model.on('change', this.render, this);
    },
    render: function () {
        var template = _.template($("#player-stats-template").html(), this.model.toJSON());
        this.$el.html(template);
        return this;
    }
});

app.m = {player: {}};
app.m.player.stats = new app.PlayerStats();

app.playerStatsView = new app.PlayerStatsView({model: app.m.player.stats}).render();


/* =========================
 *      WIN/LOSS STATS
 =========================*/
app.WLStats = Backbone.Model.extend({
    defaults: {
        title: 'Winnings',
        plural: 'Wins',
        singular: 'Win',
        count: 0,
        percentage: 0,
        amount: 0
    },
    /**
     *  Expects positive numbers for wins and negative numbers for losses
     */
    myUpdate: function(amount) {
        var count = this.get('count') + 1;
        this.set('count', count);
        this.set('amount', this.get('amount') + amount);
    },
    updatePercentage: function(count) {
        this.set('percentage', this.get('count') * 100.0 / count);
    }
});

app.WLStatsView = Backbone.View.extend({
    tagName: 'span',
    initialize: function () {
        this.model.on('change', this.render, this);
    },
    render: function () {
        var template = _.template($("#wl-stats-template").html(), this.model.toJSON());
        this.$el.html(template);
        return this;
    }
}, {
    winSelector: '#win-stats-container',
    lossSelector: '#loss-stats-container'
});

app.m.player.win = new app.WLStats();
app.m.player.loss = new app.WLStats({
    title: 'Losses',
    plural: 'Losses',
    singular: 'Lose'
});

app.winStatsView = new app.WLStatsView({model: app.m.player.win});
$(app.WLStatsView.winSelector).html(app.winStatsView.render().el);
app.lossStatsView = new app.WLStatsView({model: app.m.player.loss});
$(app.WLStatsView.lossSelector).html(app.lossStatsView.render().el);
