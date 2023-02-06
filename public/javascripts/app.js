const ContactManager = {
  templates: {},
  camelCase: function (text) {
    return text.replace(/([-_ ]+)([^-_ ])/g, (_match, _match1, match2) =>
      match2.toUpperCase()
    );
  },

  compileTemplates: function () {
    let scripts = [
      ...document.querySelectorAll("script[type='text/x-handlebars']"),
    ];
    scripts.forEach((template) => {
      let id = this.camelCase(template.getAttribute("id"));
      this.templates[id] = Handlebars.compile(template.innerHTML);
    });

    let partials = [...document.querySelectorAll('[data-type="partial"]')];
    partials.forEach((template) => {
      let id = this.camelCase(template.getAttribute("id"));
      Handlebars.registerPartial(id, template.innerHTML);
    });
  },

  renderSearchContacts: function () {
    let searchTemplate = this.templates.searchContact();
    this.contactSystem.insertAdjacentHTML("afterbegin", searchTemplate);
  },

  removeAppropriateLists: function () {
    if (this.contactsList) {
      this.removeContacts();
    }
    if (this.emptyContact) {
      this.removeEmptyContacts();
    }
  },

  renderEmptyContactsList: function (value) {
    this.removeAppropriateLists();

    let emptyContactsTemplate = this.templates.emptyContacts;
    this.contactSystem.insertAdjacentHTML(
      "beforeend",
      emptyContactsTemplate({ value: value })
    );
    this.emptyContact = document.querySelector("#empty-contact");
    this.emptyContact
      .querySelector(".add-contact-btn")
      .addEventListener("click", this.handleContactActions.bind(this));
  },

  removeContacts: function () {
    this.contactsList.remove();
  },

  removeEmptyContacts: function () {
    this.emptyContact.remove();
  },

  renderOccupantsContactList: function (contacts) {
    this.removeAppropriateLists();

    let contactListTemplate = this.templates.contactList;
    this.contactSystem.insertAdjacentHTML(
      "beforeend",
      contactListTemplate({ contacts: contacts })
    );

    this.contactsList = document.querySelector("#contacts");
    this.contactsList.addEventListener(
      "click",
      this.handleContactActions.bind(this)
    );
  },

  renderContactsList: async function () {
    let contacts = await this.getContacts();
    this.contacts = contacts;
    if (this.contacts.length === 0) {
      this.renderEmptyContactsList();
    } else {
      this.renderOccupantsContactList(this.contacts);
    }
  },

  removeContactForm: function () {
    document.querySelector(".contact-form").remove();
  },

  cancelContact: function (event) {
    event.preventDefault();
    this.removeContactForm();
    this.showUI();
  },

  deleteContact: async function (target) {
    let parent = target.closest("section");
    let id = parent.getAttribute("data-id");
    try {
      let response = await fetch(`http://localhost:3000/api/contacts/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(response.status);
      } else {
        alert("The contact was deleted.");
        this.resetContactSystem();
        window.location.reload();
      }
    } catch (error) {
      alert(error.message);
      console.log(error.message);
    }
  },

  editContact: async function (target) {
    let parent = target.closest("section");
    let id = parent.getAttribute("data-id");
    let contact = await this.getContact(id);
    let tags = contact["tags"] ? contact["tags"].split(",") : [];
    let contactData = {
      id: contact["id"],
      full_name: contact["full_name"],
      email: contact["email"],
      phone_number: contact["phone_number"],
      tags: tags,
    };
    this.formManager.init("edit", this.templates, this, contactData);
  },

  getContact: async function (contactId) {
    try {
      let response = await fetch(
        `http://localhost:3001/api/contacts/${contactId}`
      );
      if (!response.ok) {
        throw new Error(response.status);
      } else {
        let result = await response.json();
        return result;
      }
    } catch (error) {
      console.log(error.message);
    }
  },

  getContacts: async function () {
    try {
      let response = await fetch("http://localhost:3001/api/contacts", {
        method: "GET",
        headers: {
          "Content-type": "application/json; charset=utf-8",
        },
      });
      if (!response.ok) {
        throw new Error("can't get resources");
      } else {
        let jsonData = await response.json();
        return jsonData;
      }
    } catch (errorMessage) {
      console.log(errorMessage);
    }
  },

  addContact: function () {
    this.formManager.init("create", this.templates, this);
    console.log(this.formManager);
  },

  handleContactActions: async function (event) {
    event.preventDefault();
    let target = event.target;

    if (target.id === "edit-contact") {
      await this.editContact(target);
    } else if (target.id === "delete-contact") {
      let answer = confirm("Are you sure you want to delete this contact?");
      if (answer) await this.deleteContact(target);
    } else if (target.classList.contains("add-contact-btn")) {
      this.addContact();
    }
  },

  showUI: function () {
    let children = this.contactSystem.children;
    [...children].forEach((child) => {
      child.style.display = "flex";
    });
  },

  hideUI: function () {
    let children = this.contactSystem.children;
    [...children].forEach((child) => {
      child.style.display = "none";
    });
  },

  bindEvents: function () {
    let addContactButtons = document.querySelectorAll(".add-contact-btn");
    [...addContactButtons].forEach((button) => {
      button.addEventListener("click", this.handleContactActions.bind(this));
    });

    this.searchBox = document.querySelector("#search-box");
    this.searchBox.addEventListener("input", (event) => {
      this.searchManager.filterContacts(event);
    });

    this.tagsFilterButtons = document.querySelectorAll(".tags-filter-btn");
    [...this.tagsFilterButtons].forEach((button) => {
      button.addEventListener("click", (event) => {
        this.searchManager.filterContactsByTags(event);
      });
    });
  },

  renderTagsList: function () {
    let tagsListTemplate = this.templates.tagsList;
    this.contactSystem.insertAdjacentHTML(
      "beforeend",
      tagsListTemplate({ tags: this.tags })
    );
  },

  resetContactSystem: async function () {
    while (this.contactSystem.lastChild) {
      this.contactSystem.removeChild(this.contactSystem.lastChild);
    }

    this.contacts = await this.getContacts();

    this.tagManager = TagManager.init(this);
    this.searchManager = SearchManager.init(this);
    this.formManager = FormManager;

    this.renderSearchContacts();
    this.tags = this.tagManager.getTagsList();
    this.renderTagsList();
    await this.renderContactsList();
    this.bindEvents();
  },

  init: async function (formFields) {
    this.contactSystem = document.querySelector("#contact-system");
    this.form = null;
    this.contacts = [];
    this.compileTemplates();
    this.resetContactSystem();
  },
};

const FormManager = {
  init: function (type, templates, contactManager, contactData) {
    this.type = type;
    this.templates = templates;
    this.contactManager = contactManager;
    this.contactSystem = this.contactManager.contactSystem;
    this.currentContact = contactData;
    this.renderForm(this.type, contactData);
    this.cacheDOM();
    this.bindEvents();
  },

  cacheDOM: function () {
    this.cancelButton = document.querySelector(".cancel-btn");
    this.form = document.querySelector("form");
    this.formErrorsParagraph = document.querySelector(".form-errors");
    this.formFields = this.form.querySelectorAll(".textinput");
    this.submitButton = document.querySelector(".submit-btn");
    this.modalButton = document.querySelector("#modalBtn");
    this.modal = document.querySelector(".modal");
    this.closeModal = document.querySelector(".close-modal");
    this.modalInputs = this.modal.querySelectorAll("input");
    this.formInputTag = document.querySelector("#form-tag");
    this.removeTagElements = document.querySelectorAll(".remove-tag");

  },

  bindEvents: function () {
    this.cancelButton.addEventListener("click", this.cancelContact.bind(this));

    this.submitButton.addEventListener(
      "click",
      this.handleSubmitForm.bind(this)
    );

    this.formFields.forEach((field) =>
      field.addEventListener("focus", this.handleFocusEvent.bind(this))
    );

    this.formFields.forEach((field) =>
      field.addEventListener("blur", (e) => {
        let inputElement = e.target;
        this.validateInput(inputElement);
      })
    );

    this.modalButton.addEventListener("click", this.handleShowModal.bind(this));

    this.closeModal.addEventListener('click', this.handleCloseModal.bind(this));

    [...this.modalInputs].forEach(box => {
      box.addEventListener('input', this.handleCheckboxClick.bind(this))
    });

    this.formInputTag.addEventListener('keydown', this.addTagToCurrentContact.bind(this));

    this.removeTagElements.forEach(element => {
      element.addEventListener('click', this.handleRemoveTag.bind(this))
    })
    
  },

  handleRemoveTag: function(event) {
    event.preventDefault();
    let value = event.target.parentElement.textContent.trim();
    let contactTagsUl = document.querySelector('#contact-tags');
    let children = [...contactTagsUl.children];
    let index;
    children.forEach((element, currentIndex) => {
      if (element.textContent.trim() === value) {
        index = currentIndex;
      };
    })
    children[index].remove();
    this.currentContact.tags.splice(index, 1);
    console.log(this.currentContact.tags);
  },

  addTagToCurrentContact: function(event) { 
    if (event.key === 'Enter' || event.keyCode == 9) {
      event.preventDefault();
      let tag = event.target.value.replace(/\s+/g, " ");

      if (tag.length > 1 && !this.currentContact.tags.includes(tag)) {
        this.currentContact.tags.push(tag.toLowerCase());
        
        let contactTagsUl = document.querySelector('#contact-tags');
        let formTagListTemplate = this.templates.formTagList;
        contactTagsUl.insertAdjacentHTML('beforeend', formTagListTemplate({tag}));
        event.target.value = '';
      }
    }
  },

  handleCheckboxClick: function(event) {
    event.preventDefault();
    let tag = event.target.parentElement.textContent.trim();
    if (event.target.checked) {
      this.currentContact.tags.push(tag);

      let contactTagsUl = document.querySelector('#contact-tags');
      let formTagListTemplate = this.templates.formTagList;
      contactTagsUl.insertAdjacentHTML('beforeend', formTagListTemplate({tag}));
    }
  },

  handleCloseModal: function(event) {
    event.preventDefault();
    this.modal.style.display = 'none';
  },

  handleShowModal: function (event) {
    event.preventDefault();
    this.modal.style.display = 'block';
  },

  handleFocusEvent: function (event) {
    let input = event.target;
    if (input.name === 'tags') return;
    input.classList.remove("invalid-field");
    let label = input.previousElementSibling;
    label.classList.remove("invalid-field");

    let labelName = input.name;
    let result = labelName
      .split("_")
      .map((word) => {
        return word[0].toUpperCase() + word.slice(1);
      })
      .join(" ");
    label.textContent = result;
  },

  setFormErrorsParagraph: function () {
    this.formErrorsParagraph.textContent =
      "Please correct all inputs before submitting the form.";
  },

  renderEditForm: function (contact) {
    let editContactTemplate = this.templates.editContact;
    this.contactSystem.insertAdjacentHTML(
      "beforeend",
      editContactTemplate(contact)
    );

    let modalContent = document.querySelector(".modal-content");

    let preselectorTags = TagManager.preselectorTags;
    let tags = contact["tags"];
    let modalTagCheckbox = this.templates.modalTagCheckbox;

    preselectorTags.forEach((tag) => {
      if (!tags.includes(tag)) {
        modalContent.insertAdjacentHTML("beforeend", modalTagCheckbox({ tag }));
      } else {
        modalContent.insertAdjacentHTML(
          "beforeend",
          modalTagCheckbox({ tag, isChecked: true })
        );
      }
    });
    let contactTagsUl = document.querySelector('#contact-tags');
    let formTagListTemplate = this.templates.formTagList;

    tags.forEach(tag => {
      contactTagsUl.insertAdjacentHTML('beforeend', formTagListTemplate({tag}))
    })
    
  },

  renderContactForm: function() {
    this.currentContact = {
      tags: [],
    }
    let createContactTemplate = this.templates.createContact;
      this.contactSystem.insertAdjacentHTML(
        "beforeend",
        createContactTemplate()
      );

    let modalContent = document.querySelector(".modal-content");

    let preselectorTags = TagManager.preselectorTags;
    let modalTagCheckbox = this.templates.modalTagCheckbox;

    preselectorTags.forEach((tag) => {
        modalContent.insertAdjacentHTML("beforeend", modalTagCheckbox({ tag }));
    });
  },

  renderForm: function (formType, contact) {
    this.contactManager.hideUI();
    if (formType === "create") {
      this.renderContactForm();
    } else if (formType === "edit") {
      this.renderEditForm(contact);
    }
  },

  patternMismatch: function (inputElement) {
    return inputElement.validity.patternMismatch;
  },

  valueMissing: function (inputElement) {
    return inputElement.validity.valueMissing;
  },

  getErrorMessage: function (inputElement) {
    let inputName = inputElement.name;
    let label = document.querySelector(`label[for='${inputName}'`);
    let labelName = label.textContent;

    if (this.valueMissing(inputElement)) {
      return `${labelName} is required.`;
    } else if (
      this.patternMismatch(inputElement) &&
      labelName === "Phone Number"
    ) {
      return "Please use this format: XXX-XXX-XXXX";
    } else if (this.patternMismatch(inputElement)) {
      return `Please enter a valid ${labelName}`;
    } else {
      return null;
    }
  },

  setInputErrorMessage: function (inputElement, message) {
    label.textContent = message;
  },

  validateInput: function (inputElement) {
    let errorMessage = null;
    errorMessage = this.getErrorMessage(inputElement);

    let inputName = inputElement.name;
    let label = document.querySelector(`label[for='${inputName}'`);
    if (errorMessage !== null) {
      label.classList.remove("invalid-field");
      label.classList.add("invalid-field");
      inputElement.classList.add("invalid-field");
      label.textContent = errorMessage;
      // this.setInputErrorMessage(inputElement, errorMessage);
    }
  },

  validSubmitForm: function () {
    // check if each field input is valid
    this.formFields.forEach((field) => field.dispatchEvent(new Event("blur")));

    // if any errors, don't send form, render error message
    let inputErrors = document.querySelectorAll(".invalid-field");
    if (inputErrors.length > 0) {
      this.setFormErrorsParagraph();
      return false;
    } else {
      return true;
    }
  },

  handleSubmitForm: async function (event) {
    event.preventDefault();
    let contactTagsLi = document.querySelectorAll("#contact-tags li");
    let inputTag = document.querySelector("#form-tag");

    let tags = [...contactTagsLi].map(element => {
      return element.textContent.trim();
    });
    inputTag.value = tags.join(',');
    if (this.validSubmitForm()) {
      let formType = this.form.id;
      let data = Object.fromEntries(new FormData(this.form));
      data.tags = data.tags.replace(/\s/g, "");
      let dataId = this.form.getAttribute("data-id");

      if (formType === "create") {
        await this.submitContactForm(data, dataId, "POST");
        this.contactManager.resetContactSystem();
        window.location.reload();
      } else if (formType === "edit") {
        await this.submitContactForm(data, dataId, "PUT");
        this.contactManager.resetContactSystem();
        window.location.reload();
      }
    }
    return;
  },

  submitContactForm: async function (data, dataId, method) {
    data["id"] = dataId;
    try {
      let response = await fetch(
        `http://localhost:3000/api/contacts/${data.id}`,
        {
          method: method,
          headers: {
            "Content-Type": "application/json;charset=utf-8",
          },
          body: JSON.stringify(data),
        }
      );
      if (!response.ok) {
        throw new Error(response.status);
      } else {
        let result = response.json();
        alert("The contact");
        return;
      }
    } catch (error) {
      alert(error.message);
      console.log(error.message);
    }
  },

  removeContactForm: function () {
    document.querySelector(".contact-form").remove();
  },

  cancelContact: function (event) {
    event.preventDefault();
    this.removeContactForm();
    this.contactManager.showUI();
  },
};

const TagManager = {
  contacts: [],
  universalTagsList: [],
  preselectorTags: ["work", "home", "friend", "family", "relative", "business"],
  currentTags: [],

  init: function (ContactManager) {
    this.contacts = ContactManager.contacts;
    this.createUniversalTagsList();
    return this;
  },

  createUniversalTagsList: function () {
    let result = this.contacts.filter(({ tags }) => {
      return !!tags;
    });

    let tags = result
      .map(({ tags }) => {
        return tags.split(",");
      })
      .flatMap((array) => array);

    this.universalTagsList = [...new Set(tags)];
    this.updatePreselectorTags();
  },

  updatePreselectorTags: function () {
    this.universalTagsList.forEach((tag) => {
      if (!this.preselectorTags.includes(tag)) {
        this.preselectorTags.push(tag);
      }
    });
  },

  updateUniversalTags: function (contacts = this.contacts) {
    console.log(contacts);
  },

  getTagsList: function () {
    return this.universalTagsList;
  },
};

const SearchManager = {
  contacts: [],
  tagsFilter: [],

  init: function (ContactManager) {
    this.contacts = ContactManager.matches;
    this.contactManager = ContactManager;
    return this;
  },

  updateTagsFilter(tag) {
    if (!this.tagsFilter.includes(tag)) {
      this.tagsFilter.push(tag);
    } else {
      let index = this.tagsFilter.indexOf(tag);
      this.tagsFilter.splice(index, 1);
    }
  },

  filterContactsByTags: async function (event) {
    event.target.classList.toggle("highlight");
    let value = event.target.textContent;
    this.updateTagsFilter(value);
    this.filterContacts(event);
  },

  matchesTagFilters: function (contactTags) {
    if (contactTags) {
      let tagsArr = contactTags.split(",");
      if (this.tagsFilter.length > 0) {
        return this.tagsFilter.every((tag) => tagsArr.includes(tag));
      }
    }
  },

  filterContacts: function (event) {
    let value = event.target.value;
    this.fetchMatches(value, (matches) => {
      this.contacts = matches;

      if (this.contacts.length === 0) {
        this.contactManager.renderEmptyContactsList(value);
      } else {
        this.contactManager.renderOccupantsContactList(this.contacts);
      }
    });
  },

  fetchMatches: async function (value, callback) {
    let regex = new RegExp(`^${value}`, "gi");

    let results = await this.contactManager.getContacts();
    let matches = results.filter((contact) => {
      let [firstName, lastName] = contact["full_name"].split(" ");
      if (
        (firstName && firstName.match(regex)) ||
        (lastName && lastName.match(regex))
      ) {
        if (
          this.tagsFilter.length === 0 ||
          this.matchesTagFilters(contact["tags"])
        ) {
          return contact;
        }
      }
      return;
    });

    callback(matches);
    return;
  },
};

document.addEventListener("DOMContentLoaded", () => {
  ContactManager.init();
});
