const fs = require('fs').promises;
const path = require('path');

class TemplateService {
  /**
   * Load an HTML template from the templates directory
   * @param {string} templateName - Name of the template file (without .html extension)
   * @returns {Promise<string>} The HTML template content
   */
  async loadTemplate(templateName) {
    const templatePath = path.join(__dirname, '..', 'templates', `${templateName}.html`);
    try {
      const template = await fs.readFile(templatePath, 'utf-8');
      return template;
    } catch (error) {
      console.error(`Error loading template ${templateName}:`, error.message);
      throw new Error(`Template ${templateName} not found`);
    }
  }

  /**
   * Replace placeholders in template with actual values
   * @param {string} template - HTML template string
   * @param {Object} data - Object with key-value pairs to replace
   * @returns {string} Processed HTML with values replaced
   */
  renderTemplate(template, data) {
    let rendered = template;
    
    // Replace all {{variable}} placeholders with actual values
    Object.keys(data).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      rendered = rendered.replace(regex, data[key] || '');
    });

    return rendered;
  }

  /**
   * Load and render a template in one step
   * @param {string} templateName - Name of the template
   * @param {Object} data - Data to populate the template
   * @returns {Promise<string>} Rendered HTML
   */
  async getRenderedTemplate(templateName, data) {
    const template = await this.loadTemplate(templateName);
    return this.renderTemplate(template, data);
  }
}

module.exports = new TemplateService();
