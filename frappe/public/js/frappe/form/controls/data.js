frappe.ui.form.ControlData = frappe.ui.form.ControlInput.extend({
	html_element: "input",
	input_type: "text",
	trigger_change_on_input_event: true,
	make_input: function() {
		if(this.$input) return;

		this.$input = $("<"+ this.html_element +">")
			.attr("type", this.input_type)
			.attr("autocomplete", "off")
			.addClass("input-with-feedback form-control")
			.prependTo(this.input_area);

		if (in_list(['Data', 'Link', 'Dynamic Link', 'Password', 'Select', 'Read Only', 'Attach', 'Attach Image'],
			this.df.fieldtype)) {
			this.$input.attr("maxlength", this.df.length || 140);
		}

		this.set_input_attributes();
		this.input = this.$input.get(0);
		this.has_input = true;
		this.bind_change_event();
		this.setup_autoname_check();
	},
	bind_change_event: function() {
		const change_handler = e => {
			if (this.change) this.change(e);
			else {
				let value = this.get_input_value();
				this.parse_validate_and_set_in_model(value, e);
			}
		};
		this.$input.on("change", change_handler);
		if (this.trigger_change_on_input_event) {
			// debounce to avoid repeated validations on value change
			this.$input.on("input", frappe.utils.debounce(change_handler, 500));
		}
	},
	setup_autoname_check: function() {
		if (!this.df.parent) return;
		this.meta = frappe.get_meta(this.df.parent);
		if (this.meta && ((this.meta.autoname
			&& this.meta.autoname.substr(0, 6)==='field:'
			&& this.meta.autoname.substr(6) === this.df.fieldname) || this.df.fieldname==='__newname') ) {
			this.$input.on('keyup', () => {
				this.set_description('');
				if (this.doc && this.doc.__islocal) {
					// check after 1 sec
					let timeout = setTimeout(() => {
						// clear any pending calls
						if (this.last_check) clearTimeout(this.last_check);

						// check if name exists
						frappe.db.get_value(this.doctype, this.$input.val(),
							'name', (val) => {
								if (val && val.name) {
									this.set_description(__('{0} already exists. Select another name', [val.name]));
								}
							},
							this.doc.parenttype
						);
						this.last_check = null;
					}, 1000);
					this.last_check = timeout;
				}
			});
		}
	},
	set_input_attributes: function() {
		this.$input
			.attr("data-fieldtype", this.df.fieldtype)
			.attr("data-fieldname", this.df.fieldname)
			.attr("placeholder", this.df.placeholder || "");
		if(this.doctype) {
			this.$input.attr("data-doctype", this.doctype);
		}
		if(this.df.input_css) {
			this.$input.css(this.df.input_css);
		}
		if(this.df.input_class) {
			this.$input.addClass(this.df.input_class);
		}
	},
	set_input: function(value) {
		this.last_value = this.value;
		this.value = value;
		this.set_formatted_input(value);
		this.set_disp_area(value);
		this.set_mandatory && this.set_mandatory(value);
	},
	set_formatted_input: function(value) {
		this.$input && this.$input.val(this.format_for_input(value));
	},
	get_input_value: function() {
		return this.$input ? this.$input.val() : undefined;
	},
	format_for_input: function(val) {
		return val==null ? "" : val;
	},
	validate: function(v) {
		if(this.df.is_filter) {
			return v;
		}
		if(this.df.options == 'Phone') {
			if(v+''=='') {
				return '';
			}
			var v1 = '';
			// phone may start with + and must only have numbers later, '-' and ' ' are stripped
			v = v.replace(/ /g, '').replace(/-/g, '').replace(/\(/g, '').replace(/\)/g, '');

			// allow initial +,0,00
			if(v && v.substr(0,1)=='+') {
				v1 = '+'; v = v.substr(1);
			}
			if(v && v.substr(0,2)=='00') {
				v1 += '00'; v = v.substr(2);
			}
			if(v && v.substr(0,1)=='0') {
				v1 += '0'; v = v.substr(1);
			}
			v1 += cint(v) + '';
			return v1;
		} else if(this.df.options == 'Email') {
			if(v+''=='') {
				return '';
			}

			var email_list = frappe.utils.split_emails(v);
			if (!email_list) {
				// invalid email
				return '';
			} else {
				let email_invalid = false;
				email_list.forEach(function(email) {
					if (!validate_email(email)) {
						email_invalid = true;
					}
				});
				this.df.invalid = email_invalid;
				return v;
			}

		} else {
			return v;
		}
	}
});
