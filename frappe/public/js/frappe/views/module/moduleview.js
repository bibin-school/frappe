// Copyright (c) 2013, Web Notes Technologies Pvt. Ltd. and Contributors
// MIT License. See license.txt

frappe.provide("frappe.views.moduleview");
frappe.provide("frappe.module_page");

frappe.views.ModuleFactory = frappe.views.Factory.extend({
	make: function(route) {
		var module = route[1];
		frappe.views.moduleview[module] = parent;
		new frappe.views.moduleview.ModuleView(module);
	},
});

frappe.views.moduleview.ModuleView = Class.extend({
	init: function(module) {
		this.module = module;
		this.module_info = frappe.get_module(module) || {};
		this.module_label = __(this.module_info.label || this.module);
		this.sections = {};
		this.current_section = null;
		this.make();
		$(".navbar-center").html(this.module_label);
	},

	make: function() {
		var me = this;
		return frappe.call({
			method: "frappe.desk.moduleview.get",
			args: {
				module: this.module
			},
			callback: function(r) {
				me.data = r.message;
				me.parent = frappe.make_page(true);
				frappe.views.moduleview[me.module] = me.parent;
				me.page = me.parent.page;
				me.parent.moduleview = me;
				me.render();
			}
		});
	},

	render: function() {
		this.page.main.empty();
		this.make_sidebar();
		this.sections_by_label = {};

		// index by label
		for(var i in this.data.data) {
			this.sections_by_label[this.data.data[i].label] = this.data.data[i];
		}
		this.activate(this.data.data[0].label);
	},

	make_sidebar: function(name) {
		var me = this;
		var sidebar_content = frappe.render_template("module_sidebar", {data:this.data});
		var module_sidebar = $(sidebar_content)
			.addClass("nav nav-pills nav-stacked")
			.appendTo(this.page.sidebar.addClass("hidden-xs hidden-sm"));
		var offcanvas_module_sidebar = $(sidebar_content)
			.addClass("list-unstyled sidebar-menu")
			.appendTo($(".sidebar-left .module-sidebar"));

		this.sidebar = offcanvas_module_sidebar.add(module_sidebar);
		this.sidebar.on("click", ".module-link", function() {
			me.activate($(this).parent().attr("data-label"));
		});
	},

	activate: function(name) {
		var me = this;
		if(this.current_section) {
			this.current_section.addClass("hide");
		}
		if(!this.sections[name]) {
			var data = this.sections_by_label[name];
			this.sections[name] = $(frappe.render_template("module_section", { data: data }))
				.appendTo(this.page.main);

			$(this.sections[name]).find(".module-item").each(function(i, mi) {
				$(mi).on("click", function() {
					frappe.set_route(me.get_route(data.items[$(mi).attr("data-item-index")]));
				});
			});
		}

		// set title
		this.page.set_title(repl('<span class="hidden-xs hidden-sm">%(module)s</span>\
			<span class="hidden-md hidden-lg">%(section)s</span>',
			{module: this.module_label, section: name}));

		this.current_section = this.sections[name];
		this.current_section.removeClass("hide");

		// active
		this.sidebar.find("li.active").removeClass("active");
		this.sidebar.find('[data-label="'+ name +'"]').addClass("active");

		frappe.app.update_notification_count_in_modules();
	},

	get_route: function(item) {
        var route = [item.route || item.link];
        if (!route[0]) {
            if (item.type == "doctype") {
                route = ["List", item.name];
            } else if (item.type == "page") {
                route = [item.name]
            } else if (item.type == "report") {
				if(item.is_query_report) {
					route = ["query-report", item.name];
				} else {
					route = ["Report", item.doctype, item.name];
				}
            }
        }
		return route;
	}
});
