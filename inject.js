app = {};
app.tpl = {
    templates: {},
    loadTemplates: function(temps, callback) {
        var that = this;
        var loadTemplate = function(index) {
            if (index < temps.length) {
                var temp = temps[index];
                $.get(temp.url, function(data) {
                    that.templates[temp.name] = data;
                    index++;
                    loadTemplate(index);
                });
            } else if (callback) {
                callback();
            }
        };
        loadTemplate(0);
    },
    put: function(name, html) {
        this.templates[name] = html;
    },
    get: function(name) {
        return this.templates[name];
    }
};

(function() {
    var temps = [
        {
            url: 'https://rawgit.com/markoniel404/test/master/index.html',
            name: 'main'
        }
    ];
    app.tpl.loadTemplates(temps, function() {
        $('#blackjack .game').prepend('<div class="container" id="inject-container"></div>');
        $('#inject-container').html(app.tpl.get('main'));
    });
})();

