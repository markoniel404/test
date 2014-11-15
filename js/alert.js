/**
 * Created by david on 11/6/14.
 */

app.Alert = Backbone.Model.extend({
    defaults: {
        alertType: 'danger',
        title: 'There was a problem:',
        message: 'See javascript console for more details.'
    }
}, {
    error: 'danger',
    info: 'info',
    warning: 'warning',
    success: 'success'
});

app.AlertView = Backbone.View.extend({
    tagname: 'li',
    render: function() {
        var template = _.template( $("#alert-template").html(), this.model.toJSON() );
        this.$el.html( template );
        return this;
    }
}, {
    containerSelector: '#alert-container'
});

app.alert = function(alertType, title, message) {
    var model = new app.Alert({
        alertType: alertType,
        title: title,
        message: message
    });
    var view = new app.AlertView({ model: model });
    $(app.AlertView.containerSelector).append(view.render().el);
};